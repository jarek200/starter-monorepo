/**
 * Lambda Handler: Configure GitHub Environments (Step Functions task)
 *
 * For each provisioned account, creates the matching GitHub Environment in the
 * new repo and sets the AWS_ROLE_ARN secret so OIDC-based deployments work
 * without any manual setup.
 *
 * Also creates the deploy labels (deploy:int, deploy:stage, deploy:prod) that
 * the deploy workflow listens for.
 */

import { createSign } from 'node:crypto';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import sodium from 'libsodium-wrappers';

const secretsClient = new SecretsManagerClient({});

const GITHUB_APP_ID = process.env.GITHUB_APP_ID!;
const GITHUB_PRIVATE_KEY_SECRET_ARN = process.env.GITHUB_PRIVATE_KEY_SECRET_ARN!;
const GITHUB_INSTALLATION_ID = process.env.GITHUB_INSTALLATION_ID!;

interface ProvisionedAccount {
  name: string;
  email: string;
  accountId: string;
  roleArn: string;
  envKey: string;
}

interface ConfigureEnvironmentsInput {
  projectId: string;
  repoFullName: string;
  accounts: ProvisionedAccount[];
}

async function getGitHubToken(): Promise<string> {
  const secret = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: GITHUB_PRIVATE_KEY_SECRET_ARN })
  );
  const privateKey = secret.SecretString!;
  const jwt = createGitHubAppJwt(privateKey);

  const tokenResponse = await fetch(
    `https://api.github.com/app/installations/${GITHUB_INSTALLATION_ID}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'AdminProjectFactory/1.0',
      },
    }
  );

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    throw new Error(`Failed to get installation token: ${tokenResponse.status} ${body}`);
  }

  const { token } = (await tokenResponse.json()) as { token: string };
  return token;
}

function createGitHubAppJwt(privateKeyPem: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = { iat: now - 60, exp: now + 600, iss: GITHUB_APP_ID };

  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${header}.${body}`;

  const sign = createSign('RSA-SHA256');
  sign.update(signingInput);
  return `${signingInput}.${sign.sign(privateKeyPem, 'base64url')}`;
}

async function githubRequest(
  token: string,
  method: string,
  path: string,
  body?: unknown
): Promise<unknown> {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'AdminProjectFactory/1.0',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${method} ${path} → ${response.status}: ${text}`);
  }

  if (response.status === 204) return {};
  return response.json();
}

let sodiumReady: Promise<void> | null = null;

async function ensureSodium(): Promise<void> {
  if (!sodiumReady) sodiumReady = sodium.ready;
  await sodiumReady;
}

/** GitHub Actions secrets: Libsodium sealed box (`crypto_box_seal`) per GitHub REST API. */
async function encryptSecret(publicKeyBase64: string, secretValue: string): Promise<string> {
  await ensureSodium();
  const publicKey = sodium.from_base64(publicKeyBase64, sodium.base64_variants.ORIGINAL);
  const message = sodium.from_string(secretValue);
  const sealed = sodium.crypto_box_seal(message, publicKey);
  return sodium.to_base64(sealed, sodium.base64_variants.ORIGINAL);
}

async function setEnvironmentSecret(
  token: string,
  repoFullName: string,
  envName: string,
  secretName: string,
  secretValue: string
): Promise<void> {
  // Get repo public key for secret encryption
  const { key_id: keyId, key: publicKey } = (await githubRequest(
    token,
    'GET',
    `/repos/${repoFullName}/environments/${envName}/secrets/public-key`
  )) as { key_id: string; key: string };

  const encryptedValue = await encryptSecret(publicKey, secretValue);

  await githubRequest(
    token,
    'PUT',
    `/repos/${repoFullName}/environments/${envName}/secrets/${secretName}`,
    { encrypted_value: encryptedValue, key_id: keyId }
  );
}

export const handler = async (event: ConfigureEnvironmentsInput): Promise<void> => {
  const { repoFullName, accounts } = event;

  console.log(`Configuring GitHub environments for ${repoFullName}`);

  const token = await getGitHubToken();

  for (const account of accounts) {
    const envKey = account.envKey;

    console.log(`Creating environment: ${envKey}`);

    // Create environment (upsert — no error if already exists)
    await githubRequest(token, 'PUT', `/repos/${repoFullName}/environments/${envKey}`, {
      wait_timer: 0,
      reviewers: [],
      deployment_branch_policy: null,
    });

    // Set AWS_ROLE_ARN secret in the environment
    await setEnvironmentSecret(token, repoFullName, envKey, 'AWS_ROLE_ARN', account.roleArn);

    // Create deploy label (deploy:int, deploy:stage, deploy:prod, etc.)
    try {
      await githubRequest(token, 'POST', `/repos/${repoFullName}/labels`, {
        name: `deploy:${envKey}`,
        color: envKey === 'prod' ? 'd93f0b' : envKey === 'stage' ? 'e4e669' : '0075ca',
        description: `Trigger ${envKey} deployment`,
      });
    } catch {
      // Label may already exist — non-fatal
    }

    console.log(`Environment ${envKey} configured with AWS_ROLE_ARN`);
  }
};
