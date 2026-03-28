/**
 * AppSync resolver: list repositories visible to the configured GitHub App installation.
 * Used by the admin UI template-repo dropdown.
 */

import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({});

const GITHUB_APP_ID = process.env.GITHUB_APP_ID ?? '';
const GITHUB_PRIVATE_KEY_SECRET_ARN = process.env.GITHUB_PRIVATE_KEY_SECRET_ARN ?? '';
const GITHUB_INSTALLATION_ID = process.env.GITHUB_INSTALLATION_ID ?? '';

export interface GithubRepoOption {
  fullName: string;
  name: string;
  isTemplate: boolean;
  private: boolean;
}

/** GitHub REST `repository` subset */
interface GhRepo {
  full_name: string;
  name: string;
  is_template?: boolean;
  private?: boolean;
}

async function createGitHubAppJwt(privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = { iat: now - 60, exp: now + 600, iss: GITHUB_APP_ID };
  const { createSign } = await import('node:crypto');
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${header}.${body}`;
  const sign = createSign('RSA-SHA256');
  sign.update(signingInput);
  const signature = sign.sign(privateKeyPem, 'base64url');
  return `${signingInput}.${signature}`;
}

async function getInstallationToken(): Promise<string> {
  const secretId =
    GITHUB_PRIVATE_KEY_SECRET_ARN.replace(/-\*$/, '') || '/admin-factory/github-private-key';

  let privateKey: string;
  try {
    const secret = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretId }));
    privateKey = secret.SecretString ?? '';
    if (!privateKey) throw new Error('Secrets Manager returned empty GitHub private key');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const name = err instanceof Error ? err.name : 'Unknown';
    throw new Error(
      `SecretsManager error (${name}): ${msg} [SecretId=${secretId}, APP_ID=${GITHUB_APP_ID}, INST_ID=${GITHUB_INSTALLATION_ID}]`
    );
  }

  const jwt = await createGitHubAppJwt(privateKey);

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
    throw new Error(`GitHub installation token: ${tokenResponse.status} ${body}`);
  }

  const { token } = (await tokenResponse.json()) as { token: string };
  return token;
}

async function listInstallationRepositories(token: string): Promise<GhRepo[]> {
  const all: GhRepo[] = [];
  let page = 1;
  const perPage = 100;

  for (;;) {
    const res = await fetch(
      `https://api.github.com/installation/repositories?per_page=${perPage}&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'AdminProjectFactory/1.0',
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub list repos: ${res.status} ${text}`);
    }

    const data = (await res.json()) as { repositories?: GhRepo[] };
    const batch = data.repositories ?? [];
    all.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
    if (page > 100) break;
  }

  return all;
}

/** Called from `create.handler` when `event.info.fieldName === 'listGithubReposForTemplate'`. */
export async function listGithubReposForTemplate(): Promise<GithubRepoOption[]> {
  if (!GITHUB_APP_ID || !GITHUB_PRIVATE_KEY_SECRET_ARN || !GITHUB_INSTALLATION_ID) {
    throw new Error(
      'GitHub App env not configured (GITHUB_APP_ID, secret ARN, GITHUB_INSTALLATION_ID)'
    );
  }

  const token = await getInstallationToken();
  const repos = await listInstallationRepositories(token);

  const options: GithubRepoOption[] = repos.map((r) => ({
    fullName: r.full_name,
    name: r.name,
    isTemplate: Boolean(r.is_template),
    private: Boolean(r.private),
  }));

  options.sort((a, b) => a.fullName.localeCompare(b.fullName));
  return options;
}
