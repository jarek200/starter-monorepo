/// <reference path="../.sst/platform/config.d.ts" />

export function createUserProfile(
  table: ReturnType<typeof import('./storage').createStorage>['table']
) {
  // Lambda: Create user profile on signup
  const createUserProfileFunction = new sst.aws.Function('CreateUserProfile', {
    handler: 'packages/functions/src/auth/create-user-profile.handler',
    runtime: 'nodejs22.x',
    link: [table],
    nodejs: {
      loader: {
        '.node': 'file',
      },
      esbuild: {
        external: ['fsevents', 'lightningcss'],
      },
    },
    environment: {
      TABLE_NAME: table.name,
    },
    permissions: [
      {
        actions: ['dynamodb:PutItem'],
        resources: [table.arn],
      },
    ],
  });

  return createUserProfileFunction;
}
