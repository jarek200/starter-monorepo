/// <reference path="../.sst/platform/config.d.ts" />

import { stageConfig } from './stage-config';

const LAMBDA_DEFAULTS = {
  runtime: 'nodejs22.x' as const,
  memory: stageConfig.lambda.memory,
  nodejs: {
    loader: { '.node': 'file' as const },
    esbuild: { external: ['fsevents', 'lightningcss'] },
  },
};

// ─── Provisioning task Lambdas ────────────────────────────────────────────────

export function createProvisioningLambdas(
  table: ReturnType<typeof import('./storage').createStorage>['table'],
  githubPrivateKeySecretArn: string
) {
  /** Updates DynamoDB provisioning phase — called at every SFN transition */
  const updateStatusFn = new sst.aws.Function('UpdateStatus', {
    ...LAMBDA_DEFAULTS,
    handler: 'packages/functions/src/provisioning/update-status.handler',
    link: [table],
    environment: { TABLE_NAME: table.name },
    permissions: [
      { actions: ['dynamodb:UpdateItem'], resources: [table.arn] },
    ],
  });

  /** AWS Organizations account vending (runs in management account) */
  const vendAccountFn = new sst.aws.Function('VendAccount', {
    ...LAMBDA_DEFAULTS,
    timeout: '900 seconds', // Up to 15 min — account creation can take ~10 min
    handler: 'packages/functions/src/provisioning/vend-accounts.handler',
    link: [table],
    environment: { TABLE_NAME: table.name },
    permissions: [
      {
        actions: [
          'organizations:CreateAccount',
          'organizations:DescribeCreateAccountStatus',
          'organizations:ListAccounts',
        ],
        resources: ['*'],
      },
      { actions: ['dynamodb:GetItem'], resources: [table.arn] },
    ],
  });

  /** Assumes OrganizationAccountAccessRole, creates OIDC provider + IAM role */
  const bootstrapAccountFn = new sst.aws.Function('BootstrapAccount', {
    ...LAMBDA_DEFAULTS,
    timeout: '300 seconds',
    handler: 'packages/functions/src/provisioning/bootstrap-account.handler',
    permissions: [
      {
        actions: ['sts:AssumeRole'],
        resources: ['arn:aws:iam::*:role/OrganizationAccountAccessRole'],
      },
    ],
  });

  /** Creates GitHub repo from template via GitHub App */
  const createRepoFn = new sst.aws.Function('CreateRepo', {
    ...LAMBDA_DEFAULTS,
    timeout: '120 seconds',
    handler: 'packages/functions/src/provisioning/create-repo.handler',
    environment: {
      GITHUB_APP_ID: process.env.GITHUB_APP_ID ?? '',
      GITHUB_PRIVATE_KEY_SECRET_ARN: githubPrivateKeySecretArn,
      GITHUB_INSTALLATION_ID: process.env.GITHUB_INSTALLATION_ID ?? '',
    },
    permissions: [
      {
        actions: ['secretsmanager:GetSecretValue'],
        resources: [githubPrivateKeySecretArn],
      },
    ],
  });

  /** Configures GitHub Environments + AWS_ROLE_ARN secrets */
  const configureEnvironmentsFn = new sst.aws.Function('ConfigureEnvironments', {
    ...LAMBDA_DEFAULTS,
    timeout: '120 seconds',
    handler: 'packages/functions/src/provisioning/configure-environments.handler',
    environment: {
      GITHUB_APP_ID: process.env.GITHUB_APP_ID ?? '',
      GITHUB_PRIVATE_KEY_SECRET_ARN: githubPrivateKeySecretArn,
      GITHUB_INSTALLATION_ID: process.env.GITHUB_INSTALLATION_ID ?? '',
    },
    permissions: [
      {
        actions: ['secretsmanager:GetSecretValue'],
        resources: [githubPrivateKeySecretArn],
      },
    ],
  });

  return {
    updateStatusFn,
    vendAccountFn,
    bootstrapAccountFn,
    createRepoFn,
    configureEnvironmentsFn,
  };
}

// ─── createProject Lambda (AppSync resolver) ─────────────────────────────────

export function createProjectLambda(
  table: ReturnType<typeof import('./storage').createStorage>['table'],
  stateMachineArn: $util.Input<string>
) {
  return new sst.aws.Function('CreateProject', {
    ...LAMBDA_DEFAULTS,
    handler: 'packages/functions/src/projects/create.handler',
    link: [table],
    environment: {
      TABLE_NAME: table.name,
      STATE_MACHINE_ARN: stateMachineArn,
    },
    permissions: [
      {
        actions: ['dynamodb:PutItem', 'dynamodb:UpdateItem'],
        resources: [table.arn],
      },
      {
        actions: ['states:StartExecution'],
        resources: [stateMachineArn],
      },
    ],
  });
}

// ─── Step Functions state machine ─────────────────────────────────────────────

export function createProvisioningStateMachine(
  fns: ReturnType<typeof createProvisioningLambdas>
) {
  const {
    updateStatusFn,
    vendAccountFn,
    bootstrapAccountFn,
    createRepoFn,
    configureEnvironmentsFn,
  } = fns;

  // IAM execution role for Step Functions
  const sfnRole = new aws.iam.Role('SfnExecutionRole', {
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { Service: 'states.amazonaws.com' },
          Action: 'sts:AssumeRole',
        },
      ],
    }),
  });

  new aws.iam.RolePolicy('SfnExecutionPolicy', {
    role: sfnRole.id,
    policy: $jsonStringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['lambda:InvokeFunction'],
          Resource: [
            updateStatusFn.arn,
            vendAccountFn.arn,
            bootstrapAccountFn.arn,
            createRepoFn.arn,
            configureEnvironmentsFn.arn,
          ],
        },
        {
          Effect: 'Allow',
          Action: [
            'logs:CreateLogGroup',
            'logs:CreateLogDelivery',
            'logs:PutLogEvents',
            'logs:DescribeLogGroups',
            'logs:DescribeResourcePolicies',
          ],
          Resource: '*',
        },
        {
          // Allow X-Ray tracing
          Effect: 'Allow',
          Action: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
          Resource: '*',
        },
      ],
    }),
  });

  // State machine definition
  // Provisioning flow: BILLING → (Map: vend + bootstrap each account) → ACCOUNTS → CreateRepo → ConfigureEnvs → DONE
  // Any failure routes to FAILED phase update.
  const definition = $interpolate`{
    "Comment": "Admin Project Factory provisioning: billing accounts github",
    "StartAt": "SetBillingPhase",
    "States": {
      "SetBillingPhase": {
        "Type": "Task",
        "Resource": "arn:aws:states:::lambda:invoke",
        "Parameters": {
          "FunctionName": "${updateStatusFn.arn}",
          "Payload": {
            "projectId.$": "$.projectId",
            "phase": "BILLING",
            "progress": 5
          }
        },
        "ResultPath": null,
        "Next": "VendAndBootstrapAccounts",
        "Catch": [{"ErrorEquals": ["States.ALL"], "ResultPath": "$.sfnError", "Next": "SetFailedPhase"}]
      },

      "VendAndBootstrapAccounts": {
        "Type": "Map",
        "ItemsPath": "$.accounts",
        "ItemSelector": {
          "name.$": "$$.Map.Item.Value.name",
          "email.$": "$$.Map.Item.Value.email",
          "projectId.$": "$.projectId",
          "projectSlug.$": "$.slug",
          "githubOrg.$": "$.githubOrg"
        },
        "MaxConcurrency": 5,
        "Iterator": {
          "StartAt": "VendAccount",
          "States": {
            "VendAccount": {
              "Type": "Task",
              "Resource": "arn:aws:states:::lambda:invoke",
              "Parameters": {
                "FunctionName": "${vendAccountFn.arn}",
                "Payload.$": "$"
              },
              "ResultSelector": {
                "name.$": "$.Payload.name",
                "email.$": "$.Payload.email",
                "accountId.$": "$.Payload.accountId",
                "projectSlug.$": "$$.Execution.Input.slug",
                "githubOrg.$": "$$.Execution.Input.githubOrg"
              },
              "Retry": [
                {
                  "ErrorEquals": ["States.TaskFailed"],
                  "IntervalSeconds": 30,
                  "MaxAttempts": 3,
                  "BackoffRate": 2
                }
              ],
              "Next": "BootstrapAccount"
            },
            "BootstrapAccount": {
              "Type": "Task",
              "Resource": "arn:aws:states:::lambda:invoke",
              "Parameters": {
                "FunctionName": "${bootstrapAccountFn.arn}",
                "Payload.$": "$"
              },
              "ResultSelector": {
                "name.$": "$.Payload.name",
                "email.$": "$.Payload.email",
                "accountId.$": "$.Payload.accountId",
                "roleArn.$": "$.Payload.roleArn",
                "envKey.$": "$.Payload.envKey"
              },
              "Retry": [
                {
                  "ErrorEquals": ["States.TaskFailed"],
                  "IntervalSeconds": 15,
                  "MaxAttempts": 3,
                  "BackoffRate": 2
                }
              ],
              "End": true
            }
          }
        },
        "ResultPath": "$.provisionedAccounts",
        "Next": "SetAccountsPhase",
        "Catch": [{"ErrorEquals": ["States.ALL"], "ResultPath": "$.sfnError", "Next": "SetFailedPhase"}]
      },

      "SetAccountsPhase": {
        "Type": "Task",
        "Resource": "arn:aws:states:::lambda:invoke",
        "Parameters": {
          "FunctionName": "${updateStatusFn.arn}",
          "Payload": {
            "projectId.$": "$.projectId",
            "phase": "ACCOUNTS",
            "progress": 66,
            "accounts.$": "$.provisionedAccounts"
          }
        },
        "ResultPath": null,
        "Next": "CreateRepo",
        "Catch": [{"ErrorEquals": ["States.ALL"], "ResultPath": "$.sfnError", "Next": "SetFailedPhase"}]
      },

      "CreateRepo": {
        "Type": "Task",
        "Resource": "arn:aws:states:::lambda:invoke",
        "Parameters": {
          "FunctionName": "${createRepoFn.arn}",
          "Payload": {
            "projectId.$": "$.projectId",
            "slug.$": "$.slug",
            "name.$": "$.name",
            "templateRepo.$": "$.templateRepo",
            "githubOrg.$": "$.githubOrg",
            "accounts.$": "$.provisionedAccounts"
          }
        },
        "ResultSelector": {
          "githubUrl.$": "$.Payload.githubUrl",
          "repoFullName.$": "$.Payload.repoFullName"
        },
        "ResultPath": "$.repo",
        "Next": "SetGithubPhase",
        "Catch": [{"ErrorEquals": ["States.ALL"], "ResultPath": "$.sfnError", "Next": "SetFailedPhase"}]
      },

      "SetGithubPhase": {
        "Type": "Task",
        "Resource": "arn:aws:states:::lambda:invoke",
        "Parameters": {
          "FunctionName": "${updateStatusFn.arn}",
          "Payload": {
            "projectId.$": "$.projectId",
            "phase": "GITHUB",
            "progress": 80
          }
        },
        "ResultPath": null,
        "Next": "ConfigureEnvironments",
        "Catch": [{"ErrorEquals": ["States.ALL"], "ResultPath": "$.sfnError", "Next": "SetFailedPhase"}]
      },

      "ConfigureEnvironments": {
        "Type": "Task",
        "Resource": "arn:aws:states:::lambda:invoke",
        "Parameters": {
          "FunctionName": "${configureEnvironmentsFn.arn}",
          "Payload": {
            "projectId.$": "$.projectId",
            "repoFullName.$": "$.repo.repoFullName",
            "accounts.$": "$.provisionedAccounts"
          }
        },
        "ResultPath": null,
        "Next": "SetDonePhase",
        "Catch": [{"ErrorEquals": ["States.ALL"], "ResultPath": "$.sfnError", "Next": "SetFailedPhase"}]
      },

      "SetDonePhase": {
        "Type": "Task",
        "Resource": "arn:aws:states:::lambda:invoke",
        "Parameters": {
          "FunctionName": "${updateStatusFn.arn}",
          "Payload": {
            "projectId.$": "$.projectId",
            "phase": "DONE",
            "progress": 100,
            "githubUrl.$": "$.repo.githubUrl"
          }
        },
        "ResultPath": null,
        "End": true
      },

      "SetFailedPhase": {
        "Type": "Task",
        "Resource": "arn:aws:states:::lambda:invoke",
        "Parameters": {
          "FunctionName": "${updateStatusFn.arn}",
          "Payload": {
            "projectId.$": "$.projectId",
            "phase": "FAILED",
            "sfnError.$": "$.sfnError"
          }
        },
        "ResultPath": null,
        "End": true
      }
    }
  }`;

  const stateMachine = new aws.sfn.StateMachine('ProvisioningStateMachine', {
    roleArn: sfnRole.arn,
    definition,
    type: 'STANDARD',
    // Logging requires `destinations` with a CloudWatch log group ARN; omit to use default (no CW logs).
  });

  return stateMachine;
}
