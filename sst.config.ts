/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'sst-monorepo-starter',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      home: 'aws',
    };
  },
  async run() {
    // Dynamic imports (required by SST)
    const { createStorage } = await import('./infra/storage');
    const { createUserProfile } = await import('./infra/functions');
    const { createAuth } = await import('./infra/auth');
    const { createApi, createDataSource } = await import('./infra/api/api-setup');
    const { addAllResolvers } = await import('./infra/api/resolvers');

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
        VITE_TABLE_NAME: table.name,
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
