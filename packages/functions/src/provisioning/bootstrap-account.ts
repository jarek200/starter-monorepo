/**
 * Lambda Handler: Bootstrap New AWS Account (Step Functions task)
 *
 * Assumes the OrganizationAccountAccessRole in the freshly-created member
 * account, then:
 *   1. Creates the IAM OIDC provider for GitHub Actions
 *   2. Creates the GitHubActions-<envSlug> IAM role with an OIDC trust policy
 *      scoped to the new project repo + environment
 *   3. Attaches AdministratorAccess (scope down to least-privilege in a later phase)
 *
 * Returns the role ARN for the GitHub step to store as AWS_ROLE_ARN.
 */

import {
  AttachRolePolicyCommand,
  CreateOpenIDConnectProviderCommand,
  CreateRoleCommand,
  GetOpenIDConnectProviderCommand,
  GetRoleCommand,
  IAMClient,
} from '@aws-sdk/client-iam';
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';

const MANAGEMENT_ACCOUNT_ID = process.env.MANAGEMENT_ACCOUNT_ID!;
const GITHUB_OIDC_URL = 'https://token.actions.githubusercontent.com';
const GITHUB_OIDC_THUMBPRINT = '6938fd4d98bab03faadb97b34396831e3780aea1';
const GITHUB_OIDC_AUDIENCE = 'sts.amazonaws.com';

const stsClient = new STSClient({});

interface BootstrapAccountInput {
  name: string;
  email: string;
  accountId: string;
  /** Determined from the project's github org + slug when the SFN starts */
  projectSlug?: string;
  githubOrg?: string;
}

interface BootstrapAccountOutput {
  name: string;
  email: string;
  accountId: string;
  roleArn: string;
  envKey: string;
}

function envKeyFromAccountName(name: string): string {
  // "acme-prod" → "prod", "acme-int" → "int" (last segment after last dash)
  // If no dash, use the name as-is, lowercased
  const parts = name.toLowerCase().split('-');
  return parts[parts.length - 1] ?? name.toLowerCase();
}

async function assumeAccountRole(accountId: string): Promise<IAMClient> {
  const roleArn = `arn:aws:iam::${accountId}:role/OrganizationAccountAccessRole`;

  const assumed = await stsClient.send(
    new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: `BootstrapAccount-${accountId}`,
      DurationSeconds: 3600,
    })
  );

  const creds = assumed.Credentials;
  if (!creds) throw new Error(`Failed to assume role in account ${accountId}`);

  return new IAMClient({
    credentials: {
      accessKeyId: creds.AccessKeyId!,
      secretAccessKey: creds.SecretAccessKey!,
      sessionToken: creds.SessionToken!,
    },
  });
}

async function ensureOidcProvider(iamClient: IAMClient): Promise<void> {
  const providerArn = `arn:aws:iam::${MANAGEMENT_ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com`;

  try {
    await iamClient.send(
      new GetOpenIDConnectProviderCommand({ OpenIDConnectProviderArn: providerArn })
    );
    console.log('OIDC provider already exists');
    return;
  } catch (err: unknown) {
    const e = err as { name?: string };
    if (e.name !== 'NoSuchEntityException') throw err;
  }

  await iamClient.send(
    new CreateOpenIDConnectProviderCommand({
      Url: GITHUB_OIDC_URL,
      ClientIDList: [GITHUB_OIDC_AUDIENCE],
      ThumbprintList: [GITHUB_OIDC_THUMBPRINT],
    })
  );
  console.log('OIDC provider created');
}

async function ensureDeployRole(
  iamClient: IAMClient,
  accountId: string,
  roleName: string,
  githubOrg: string,
  projectSlug: string,
  envKey: string
): Promise<string> {
  try {
    const existing = await iamClient.send(new GetRoleCommand({ RoleName: roleName }));
    const arn = existing.Role?.Arn;
    if (arn) {
      console.log(`Role ${roleName} already exists: ${arn}`);
      return arn;
    }
  } catch (err: unknown) {
    const e = err as { name?: string };
    if (e.name !== 'NoSuchEntityException') throw err;
  }

  const trustPolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: {
          Federated: `arn:aws:iam::${accountId}:oidc-provider/token.actions.githubusercontent.com`,
        },
        Action: 'sts:AssumeRoleWithWebIdentity',
        Condition: {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': GITHUB_OIDC_AUDIENCE,
            'token.actions.githubusercontent.com:sub': `repo:${githubOrg}/${projectSlug}:environment:${envKey}`,
          },
        },
      },
    ],
  };

  const created = await iamClient.send(
    new CreateRoleCommand({
      RoleName: roleName,
      AssumeRolePolicyDocument: JSON.stringify(trustPolicy),
      Description: `GitHub Actions deploy role for ${githubOrg}/${projectSlug} (${envKey})`,
      Tags: [
        { Key: 'ManagedBy', Value: 'AdminProjectFactory' },
        { Key: 'GitHubOrg', Value: githubOrg },
        { Key: 'ProjectSlug', Value: projectSlug },
        { Key: 'Environment', Value: envKey },
      ],
    })
  );

  const roleArn = created.Role?.Arn;
  if (!roleArn) throw new Error('CreateRole returned no ARN');

  // Attach AdministratorAccess — narrow to least-privilege in a future hardening phase
  await iamClient.send(
    new AttachRolePolicyCommand({
      RoleName: roleName,
      PolicyArn: 'arn:aws:iam::aws:policy/AdministratorAccess',
    })
  );

  console.log(`Role created: ${roleArn}`);
  return roleArn;
}

export const handler = async (event: BootstrapAccountInput): Promise<BootstrapAccountOutput> => {
  const { name, email, accountId } = event;
  const projectSlug = event.projectSlug ?? 'project';
  const githubOrg = event.githubOrg ?? 'org';

  const envKey = envKeyFromAccountName(name);
  const roleName = `GitHubActions-${envKey}`;

  console.log(`Bootstrapping account ${accountId} (${name}), envKey=${envKey}`);

  const iamClient = await assumeAccountRole(accountId);
  await ensureOidcProvider(iamClient);
  const roleArn = await ensureDeployRole(
    iamClient,
    accountId,
    roleName,
    githubOrg,
    projectSlug,
    envKey
  );

  return { name, email, accountId, roleArn, envKey };
};
