/// <reference path="../../../.sst/platform/config.d.ts" />

export function addProjectResolvers(
  api: ReturnType<typeof import('../api-setup').createApi>,
  dynamoDataSource: ReturnType<typeof import('../api-setup').createDataSource>,
  lambdaDataSource: ReturnType<typeof import('../api-setup').createLambdaDataSource>,
  _tableName: string
) {
  // Mutation: createProject — delegates to Lambda (needs to start Step Functions)
  api.addResolver('Mutation createProject', {
    dataSource: lambdaDataSource.name,
    code: `
      import { util } from '@aws-appsync/utils';

      export function request(ctx) {
        return {
          operation: 'Invoke',
          payload: {
            arguments: ctx.arguments,
            identity: ctx.identity,
            info: ctx.info,
          },
        };
      }

      export function response(ctx) {
        if (ctx.error) return util.error(ctx.error.message, ctx.error.type);
        return ctx.result;
      }
    `,
    // AppSync allows only one resolver per field; default replace order can try Create before Delete.
    transform: {
      resolver: (_args, opts) => {
        opts.deleteBeforeReplace = true;
      },
    },
  });

  // Query: listProjects — query by userId via GSI1
  api.addResolver('Query listProjects', {
    dataSource: dynamoDataSource.name,
    code: `
      import { util } from '@aws-appsync/utils';

      export function request(ctx) {
        const userId = ctx.identity.sub;
        return {
          operation: 'Query',
          index: 'GSI1',
          query: {
            expression: 'GSI1PK = :pk',
            expressionValues: util.dynamodb.toMapValues({
              ':pk': \`USER#\${userId}\`,
            }),
          },
          scanIndexForward: false,
          limit: 100,
        };
      }

      export function response(ctx) {
        if (ctx.error) return util.error(ctx.error.message, ctx.error.type);
        return (ctx.result.items || []).map(item => ({
          ...item,
          accounts: item.accounts || [],
          provisioningPhase: item.provisioningPhase || 'DRAFT',
          provisioningProgress: item.provisioningProgress ?? 0,
        }));
      }
    `,
  });

  // Query: getProject — fetch by PK/SK
  api.addResolver('Query getProject', {
    dataSource: dynamoDataSource.name,
    code: `
      import { util } from '@aws-appsync/utils';

      export function request(ctx) {
        const { id } = ctx.args;
        return {
          operation: 'GetItem',
          key: util.dynamodb.toMapValues({
            PK: \`PROJECT#\${id}\`,
            SK: 'METADATA',
          }),
        };
      }

      export function response(ctx) {
        if (ctx.error) return util.error(ctx.error.message, ctx.error.type);
        if (!ctx.result) return null;
        return {
          ...ctx.result,
          accounts: ctx.result.accounts || [],
          provisioningPhase: ctx.result.provisioningPhase || 'DRAFT',
          provisioningProgress: ctx.result.provisioningProgress ?? 0,
        };
      }
    `,
  });

  // Mutation: updateProject — update mutable fields only
  api.addResolver('Mutation updateProject', {
    dataSource: dynamoDataSource.name,
    code: `
      import { util } from '@aws-appsync/utils';

      export function request(ctx) {
        const { id, input } = ctx.args;
        const userId = ctx.identity.sub;

        const updateParts = [];
        const names = {};
        const values = {};

        if (input.name !== undefined) {
          updateParts.push('#name = :name');
          names['#name'] = 'name';
          values[':name'] = input.name;
        }
        if (input.description !== undefined) {
          updateParts.push('#description = :description');
          names['#description'] = 'description';
          values[':description'] = input.description;
        }
        if (input.websiteUrl !== undefined) {
          updateParts.push('#websiteUrl = :websiteUrl');
          names['#websiteUrl'] = 'websiteUrl';
          values[':websiteUrl'] = input.websiteUrl;
        }
        if (input.awsSignInUrl !== undefined) {
          updateParts.push('#awsSignInUrl = :awsSignInUrl');
          names['#awsSignInUrl'] = 'awsSignInUrl';
          values[':awsSignInUrl'] = input.awsSignInUrl;
        }
        if (input.githubUrl !== undefined) {
          updateParts.push('#githubUrl = :githubUrl');
          names['#githubUrl'] = 'githubUrl';
          values[':githubUrl'] = input.githubUrl;
        }

        if (updateParts.length === 0) {
          return util.error('No fields to update', 'ValidationError');
        }

        updateParts.push('#updatedAt = :updatedAt');
        names['#updatedAt'] = 'updatedAt';
        values[':updatedAt'] = util.time.nowISO8601();

        return {
          operation: 'UpdateItem',
          key: util.dynamodb.toMapValues({
            PK: \`PROJECT#\${id}\`,
            SK: 'METADATA',
          }),
          condition: {
            expression: '#userId = :userId',
            expressionNames: { '#userId': 'userId' },
            expressionValues: util.dynamodb.toMapValues({ ':userId': userId }),
          },
          update: {
            expression: 'SET ' + updateParts.join(', '),
            expressionNames: names,
            expressionValues: util.dynamodb.toMapValues(values),
          },
          returnValues: 'ALL_NEW',
        };
      }

      export function response(ctx) {
        if (ctx.error) return util.error(ctx.error.message, ctx.error.type);
        return {
          ...ctx.result,
          accounts: ctx.result.accounts || [],
          provisioningPhase: ctx.result.provisioningPhase || 'DRAFT',
          provisioningProgress: ctx.result.provisioningProgress ?? 0,
        };
      }
    `,
  });

  // Mutation: deleteProject — conditional delete (owner only)
  api.addResolver('Mutation deleteProject', {
    dataSource: dynamoDataSource.name,
    code: `
      import { util } from '@aws-appsync/utils';

      export function request(ctx) {
        const { id } = ctx.args;
        const userId = ctx.identity.sub;
        return {
          operation: 'DeleteItem',
          key: util.dynamodb.toMapValues({
            PK: \`PROJECT#\${id}\`,
            SK: 'METADATA',
          }),
          condition: {
            expression: '#userId = :userId',
            expressionNames: { '#userId': 'userId' },
            expressionValues: util.dynamodb.toMapValues({ ':userId': userId }),
          },
        };
      }

      export function response(ctx) {
        if (ctx.error) return util.error(ctx.error.message, ctx.error.type);
        return true;
      }
    `,
  });
}
