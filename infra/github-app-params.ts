/// <reference path="../.sst/platform/config.d.ts" />

export const GITHUB_APP_ID_PARAM_NAME = '/admin-factory/github-app-id';
export const GITHUB_INSTALLATION_ID_PARAM_NAME = '/admin-factory/github-installation-id';

/** `ignoreChanges: ["value"]` — later deploys do not overwrite parameter values you edit in AWS. */
const PARAM_OPTS = { ignoreChanges: ['value'] as const };

/**
 * Creates GitHub App id + installation id as SSM String parameters.
 *
 * Initial `value` comes from `GITHUB_APP_ID` / `GITHUB_INSTALLATION_ID` if set
 * when **first** creating the resource; otherwise obvious placeholders (replace
 * in Parameter Store, then `sst refresh` and `sst deploy`).
 *
 * If you already created these parameters manually, delete them or import them into
 * the stack before deploying — otherwise creation will fail with "already exists".
 */
export function createGithubAppSsmParameters() {
  const githubAppIdParam = new aws.ssm.Parameter(
    'AdminFactoryGithubAppId',
    {
      name: GITHUB_APP_ID_PARAM_NAME,
      type: 'String',
      description: 'GitHub App ID for Admin Project Factory',
      value: process.env.GITHUB_APP_ID?.trim() || 'REPLACE_ME_GITHUB_APP_ID',
    },
    PARAM_OPTS
  );

  const githubInstallationIdParam = new aws.ssm.Parameter(
    'AdminFactoryGithubInstallationId',
    {
      name: GITHUB_INSTALLATION_ID_PARAM_NAME,
      type: 'String',
      description: 'GitHub App installation ID for Admin Project Factory',
      value: process.env.GITHUB_INSTALLATION_ID?.trim() || 'REPLACE_ME_GITHUB_INSTALLATION_ID',
    },
    PARAM_OPTS
  );

  return { githubAppIdParam, githubInstallationIdParam };
}
