/**
 * Lambda Handler: Create Project (AppSync Lambda resolver)
 *
 * Creates a project record in DynamoDB and starts the Step Functions
 * provisioning state machine. Called by the AppSync createProject mutation.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { AppSyncResolverHandler } from 'aws-lambda';

import { listGithubReposForTemplate } from '../provisioning/list-github-repos';

const TABLE_NAME = process.env.TABLE_NAME!;
const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN!;

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const sfnClient = new SFNClient({});

interface ProjectAccountInput {
  name: string;
  email: string;
}

interface CreateProjectInput {
  name: string;
  slug: string;
  description?: string;
  templateRepo?: string;
  githubOrg?: string;
  accounts: ProjectAccountInput[];
  websiteUrl?: string;
  awsSignInUrl?: string;
}

interface AppSyncIdentityCognito {
  sub: string;
  username: string;
  claims: Record<string, unknown>;
}

export const handler: AppSyncResolverHandler<unknown, unknown> = async (event) => {
  if (event.info?.fieldName === 'listGithubReposForTemplate') {
    return listGithubReposForTemplate();
  }

  const identity = event.identity as AppSyncIdentityCognito;
  const userId = identity.sub;
  const input = (event.arguments as { input: CreateProjectInput }).input;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const project = {
    PK: `PROJECT#${id}`,
    SK: 'METADATA',
    GSI1PK: `USER#${userId}`,
    GSI1SK: `PROJECT#${now}`,
    id,
    userId,
    name: input.name,
    slug: input.slug,
    description: input.description ?? null,
    templateRepo: input.templateRepo ?? null,
    githubOrg: input.githubOrg ?? null,
    accounts: input.accounts.map((a) => ({
      name: a.name,
      email: a.email,
      accountId: null,
      roleArn: null,
      awsSignInUrl: null,
    })),
    provisioningPhase: 'BILLING',
    provisioningProgress: 0,
    executionArn: null,
    githubUrl: null,
    websiteUrl: input.websiteUrl ?? null,
    awsSignInUrl: input.awsSignInUrl ?? null,
    error: null,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: project,
      ConditionExpression: 'attribute_not_exists(PK)',
    })
  );

  // Start Step Functions execution — the state machine drives all provisioning
  const sfnInput = {
    projectId: id,
    userId,
    name: input.name,
    slug: input.slug,
    templateRepo: input.templateRepo ?? '',
    githubOrg: input.githubOrg ?? '',
    accounts: input.accounts,
  };

  const execution = await sfnClient.send(
    new StartExecutionCommand({
      stateMachineArn: STATE_MACHINE_ARN,
      name: `project-${id}`,
      input: JSON.stringify(sfnInput),
    })
  );

  // Store execution ARN for status tracking
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...project,
        executionArn: execution.executionArn,
        updatedAt: new Date().toISOString(),
      },
    })
  );

  return { ...project, executionArn: execution.executionArn };
};
