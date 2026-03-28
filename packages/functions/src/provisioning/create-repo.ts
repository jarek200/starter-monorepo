/**
 * Lambda Handler: Create GitHub Repository (Step Functions task)
 *
 * Uses the GitHub API to generate a new repository from the project template,
 * then pushes a bootstrap commit that updates:
 *   - STAGE_PROFILES in sst.config.ts (real account slugs)
 *   - deploy.yml (matrix over the actual environment slugs)
 *
 * GitHub credentials (App private key) are loaded from AWS Secrets Manager.
 */

import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

import { requiredEnv } from '../runtime-env';

const secretsClient = new SecretsManagerClient({});

const GITHUB_APP_ID = requiredEnv('GITHUB_APP_ID');
const GITHUB_PRIVATE_KEY_SECRET_ARN = requiredEnv('GITHUB_PRIVATE_KEY_SECRET_ARN');
const GITHUB_INSTALLATION_ID = requiredEnv('GITHUB_INSTALLATION_ID');

interface ProvisionedAccount {
  name: string;
  email: string;
  accountId: string;
  roleArn: string;
  envKey: string;
}

interface CreateRepoInput {
  projectId: string;
  slug: string;
  name: string;
  templateRepo: string; // "org/template-repo"
  githubOrg: string;
  accounts: ProvisionedAccount[];
}

interface CreateRepoOutput {
  githubUrl: string;
  repoFullName: string;
}

async function getGitHubToken(): Promise<string> {
  // Fetch private key from Secrets Manager
  const secret = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: GITHUB_PRIVATE_KEY_SECRET_ARN })
  );
  const privateKey = secret.SecretString;
  if (!privateKey) throw new Error('GitHub private key secret is empty');

  // Create JWT for GitHub App authentication
  const jwt = await createGitHubAppJwt(privateKey);

  // Exchange JWT for installation access token
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

async function createGitHubAppJwt(privateKeyPem: string): Promise<string> {
  // GitHub App JWT: HS256/RS256 with 10-minute expiry
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60, // issued 60 seconds ago (clock skew)
    exp: now + 600, // 10 minutes
    iss: GITHUB_APP_ID,
  };

  // Use Node.js crypto to sign RS256 JWT
  const { createSign } = await import('node:crypto');

  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${header}.${body}`;

  const sign = createSign('RSA-SHA256');
  sign.update(signingInput);
  const signature = sign.sign(privateKeyPem, 'base64url');

  return `${signingInput}.${signature}`;
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

  return response.json();
}

function buildDeployWorkflow(accounts: ProvisionedAccount[]): string {
  const envKeys = accounts.map((a) => a.envKey);

  return `name: Deploy

on:
  pull_request:
    types: [labeled]

jobs:
  deploy:
    if: startsWith(github.event.label.name, 'deploy:')
    runs-on: ubuntu-latest
    strategy:
      matrix:
        env: [${envKeys.join(', ')}]
    environment: \${{ matrix.env }}
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: \${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm install -g pnpm
      - run: pnpm install
      - run: pnpm exec sst deploy --stage \${{ matrix.env }}
`;
}

export const handler = async (event: CreateRepoInput): Promise<CreateRepoOutput | null> => {
  const { slug, name, templateRepo, githubOrg, accounts } = event;

  if (!templateRepo || templateRepo.trim() === '') {
    console.log('No templateRepo provided, skipping repo creation');
    return { githubUrl: '', repoFullName: '' };
  }

  const [templateOwner, templateName] = templateRepo.split('/');

  if (!templateOwner || !templateName) {
    throw new Error(`Invalid templateRepo format: ${templateRepo}. Expected "owner/repo"`);
  }

  const token = await getGitHubToken();

  // Check if repo already exists (idempotency)
  try {
    const existing = (await githubRequest(token, 'GET', `/repos/${githubOrg}/${slug}`)) as {
      html_url: string;
      full_name: string;
    };
    console.log(`Repo already exists: ${existing.full_name}`);
    return { githubUrl: existing.html_url, repoFullName: existing.full_name };
  } catch {
    // 404 expected — proceed with creation
  }

  // Generate repo from template
  const repo = (await githubRequest(
    token,
    'POST',
    `/repos/${templateOwner}/${templateName}/generate`,
    {
      owner: githubOrg,
      name: slug,
      description: `${name} — created by Admin Project Factory`,
      private: true,
      include_all_branches: false,
    }
  )) as { html_url: string; full_name: string; default_branch: string };

  // Wait for GitHub to finish generating the repo
  await new Promise((r) => setTimeout(r, 5000));

  // Push bootstrap commit: update deploy.yml to matrix over actual env keys
  const deployWorkflow = buildDeployWorkflow(accounts);
  const workflowPath = '.github/workflows/deploy.yml';

  try {
    // Get the current file SHA so we can update it (if it exists)
    let currentSha: string | undefined;
    try {
      const currentFile = (await githubRequest(
        token,
        'GET',
        `/repos/${repo.full_name}/contents/${workflowPath}`
      )) as { sha: string };
      currentSha = currentFile.sha;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('404')) {
        console.log(`Workflow file ${workflowPath} not found. Proceeding to create it.`);
      } else {
        throw err;
      }
    }

    await githubRequest(token, 'PUT', `/repos/${repo.full_name}/contents/${workflowPath}`, {
      message: 'chore: configure deploy matrix for project environments',
      content: Buffer.from(deployWorkflow).toString('base64'),
      sha: currentSha,
      branch: repo.default_branch,
    });

    console.log(`Updated ${workflowPath} in ${repo.full_name}`);
  } catch (err) {
    // Non-fatal: log and continue; environments can be configured manually
    console.warn(`Could not update deploy workflow: ${err}`);
  }

  console.log(`Repo created: ${repo.full_name}`);
  return { githubUrl: repo.html_url, repoFullName: repo.full_name };
};
