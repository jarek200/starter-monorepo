/// <reference path="./.sst/platform/config.d.ts" />

/**
 * Stage-to-AWS-profile mapping for local development.
 *
 * In CI the profile is irrelevant — OIDC credentials are injected via
 * aws-actions/configure-aws-credentials and take precedence over any profile
 * set here (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars override
 * providers.aws.profile per SST docs).
 *
 * For local SSO setup follow: https://sst.dev/docs/aws-accounts
 * Update the profile names below to match your ~/.aws/config entries.
 *
 * You can also override per-stage profiles via env vars without touching
 * this file:
 *   AWS_PROFILE_DEV=my-dev-profile pnpm exec sst deploy --stage dev
 */
const STAGE_PROFILES: Record<string, string> = {
  dev: process.env.AWS_PROFILE_DEV ?? 'acme-dev',
  stage: process.env.AWS_PROFILE_STAGE ?? 'acme-stage',
  prod: process.env.AWS_PROFILE_PROD ?? 'acme-prod',
};

export default $config({
  app(input) {
    const stage = input?.stage ?? 'dev';

    return {
      name: 'sst-monorepo-starter',
      /**
       * Retain all resources in prod to prevent accidental data loss.
       * All other stages (dev, stage, feature branches) are cleaned up on remove.
       */
      removal: stage === 'prod' ? 'retain' : 'remove',
      home: 'aws',
      providers: {
        aws: {
          /**
           * Map stage name to an AWS profile.
           * Falls back to the dev profile for any unrecognised stage name
           * (e.g. personal feature-branch stages like "jarek").
           *
           * IMPORTANT: AWS_PROFILE env var takes precedence over this value.
           * Remove any AWS_PROFILE from your shell / .env if you want this
           * mapping to be effective locally.
           */
          profile: STAGE_PROFILES[stage] ?? STAGE_PROFILES.dev,
        },
      },
    };
  },
  async run() {
    // Dynamic imports (required by SST)
    const { createStorage } = await import('./infra/storage');
    const { createUserProfile } = await import('./infra/functions');
    const { createAuth } = await import('./infra/auth');
    const { createApi, createDataSource } = await import('./infra/api/api-setup');
    const { addAllResolvers } = await import('./infra/api/resolvers');
    const { stageConfig } = await import('./infra/stage-config');

    // Storage: DynamoDB table
    const { table } = createStorage();

    // Functions: Lambda functions
    const createUserProfileFunction = createUserProfile(table);

    // Auth: Cognito User Pool
    const { auth, authClient } = createAuth(createUserProfileFunction);

    // API: AppSync GraphQL API
    const api = createApi(auth);

    // Data source: DynamoDB
    const dynamoDataSource = createDataSource(api, table);

    // Resolvers: Add all resolvers
    addAllResolvers(api, dynamoDataSource, String(table.name));

    // SvelteKit Site
    const web = new sst.aws.SvelteKit('Web', {
      path: 'apps/web',
      link: [table, auth, authClient, api],
      transform: {
        server(server) {
          server.runtime = 'nodejs22.x';
          server.memory = stageConfig.sveltekit.memory;
          if (!server.nodejs) {
            // biome-ignore lint/suspicious/noExplicitAny: SST types incomplete
            server.nodejs = {} as any;
          }
          // biome-ignore lint/suspicious/noExplicitAny: SST types incomplete
          const nodejs = server.nodejs as any;

          const existingExternal = (
            (nodejs.esbuild?.external as string[] | undefined) ?? []
          ).slice();
          const external = Array.from(new Set([...existingExternal, 'fsevents', 'lightningcss']));

          nodejs.loader = {
            ...(nodejs.loader ?? {}),
            '.node': 'file',
          };

          nodejs.esbuild = {
            ...(nodejs.esbuild ?? {}),
            external,
          };
        },
      },
      environment: {
        VITE_AWS_REGION: aws.getRegionOutput().name,
        VITE_USER_POOL_ID: auth.id,
        VITE_USER_POOL_CLIENT_ID: authClient.id,
        VITE_GRAPHQL_ENDPOINT: api.url,
        VITE_STAGE: $app.stage,
      },
    });

    return {
      table: table.name,
      userPoolId: auth.id,
      userPoolClientId: authClient.id,
      apiUrl: api.url,
      webUrl: web.url,
    };
  },
});
