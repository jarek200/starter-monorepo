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
    const { createApi, createDataSource, createLambdaDataSource } = await import('./infra/api/api-setup');
    const { addAllResolvers } = await import('./infra/api/resolvers');
    const { stageConfig } = await import('./infra/stage-config');
    const {
      createProvisioningLambdas,
      createProjectLambda,
      createProvisioningStateMachine,
    } = await import('./infra/provisioning');

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

    // ─── Provisioning infrastructure ────────────────────────────────────────
    // GitHub App private key is stored in Secrets Manager.
    // The ARN is injected via env var at deploy time; create the secret
    // manually in the management account before first deploy:
    //   aws secretsmanager create-secret --name /admin-factory/github-private-key \
    //     --secret-string "$(cat your-app.private-key.pem)"
    const githubPrivateKeySecretArn =
      process.env.GITHUB_PRIVATE_KEY_SECRET_ARN ??
      `arn:aws:secretsmanager:${aws.getRegionOutput().name}:${aws.getCallerIdentityOutput({}).accountId}:secret:/admin-factory/github-private-key`;

    // Provisioning task Lambdas (called by Step Functions)
    const provisioningFns = createProvisioningLambdas(table, githubPrivateKeySecretArn);

    // Step Functions state machine
    const stateMachine = createProvisioningStateMachine(provisioningFns);

    // createProject Lambda (AppSync resolver — creates DynamoDB record + starts SFN)
    const createProjectFn = createProjectLambda(table, stateMachine.arn);

    // Lambda data source for AppSync (used by createProject mutation)
    const lambdaDataSource = createLambdaDataSource(api, createProjectFn.arn);

    // Resolvers: Add all resolvers (user + project)
    addAllResolvers(api, dynamoDataSource, lambdaDataSource, String(table.name));

    // ─── SvelteKit apps ──────────────────────────────────────────────────────

    const svelteKitTransform = {
      server(server: Record<string, unknown>) {
        server.runtime = 'nodejs22.x';
        server.memory = stageConfig.sveltekit.memory;
        // biome-ignore lint/suspicious/noExplicitAny: SST types incomplete
        if (!server.nodejs) server.nodejs = {} as any;
        // biome-ignore lint/suspicious/noExplicitAny: SST types incomplete
        const nodejs = server.nodejs as any;
        const existingExternal = ((nodejs.esbuild?.external as string[] | undefined) ?? []).slice();
        nodejs.loader = { ...(nodejs.loader ?? {}), '.node': 'file' };
        nodejs.esbuild = {
          ...(nodejs.esbuild ?? {}),
          external: Array.from(new Set([...existingExternal, 'fsevents', 'lightningcss'])),
        };
      },
    };

    const sharedEnv = {
      VITE_AWS_REGION: aws.getRegionOutput().name,
      VITE_USER_POOL_ID: auth.id,
      VITE_USER_POOL_CLIENT_ID: authClient.id,
      VITE_GRAPHQL_ENDPOINT: api.url,
      VITE_STAGE: $app.stage,
    };

    // Main product site
    const web = new sst.aws.SvelteKit('Web', {
      path: 'apps/web',
      link: [table, auth, authClient, api],
      transform: svelteKitTransform,
      environment: sharedEnv,
    });

    // Admin control plane
    const admin = new sst.aws.SvelteKit('Admin', {
      path: 'apps/admin',
      link: [table, auth, authClient, api],
      transform: svelteKitTransform,
      environment: sharedEnv,
    });

    return {
      table: table.name,
      userPoolId: auth.id,
      userPoolClientId: authClient.id,
      apiUrl: api.url,
      webUrl: web.url,
      adminUrl: admin.url,
      stateMachineArn: stateMachine.arn,
    };
  },
});
