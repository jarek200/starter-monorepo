/// <reference path="../.sst/platform/config.d.ts" />

export function createStorage() {
  // DynamoDB Table
  const table = new sst.aws.Dynamo('AppTable', {
    fields: {
      PK: 'string',
      SK: 'string',
    },
    primaryIndex: { hashKey: 'PK', rangeKey: 'SK' },
    deletionProtection: $app.stage === 'prod',
  });

  return { table };
}
