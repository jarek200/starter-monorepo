/// <reference path="../../../.sst/platform/config.d.ts" />

export function addUserResolvers(
  api: ReturnType<typeof import("../api-setup").createApi>,
  dynamoDataSource: ReturnType<typeof import("../api-setup").createDataSource>,
  tableName: any
) {
  // Query: getMyProfile - Get current user's profile
  api.addResolver("Query getMyProfile", {
    dataSource: dynamoDataSource.name,
    code: `
      import { util } from '@aws-appsync/utils';
      
      export function request(ctx) {
        const userId = ctx.identity.sub;
        return {
          operation: 'GetItem',
          key: util.dynamodb.toMapValues({
            PK: \`USER#\${userId}\`,
            SK: 'PROFILE'
          })
        };
      }
      
      export function response(ctx) {
        if (ctx.error) return util.error(ctx.error.message, ctx.error.type);
        
        if (!ctx.result) return util.error('User profile not found', 'NotFound');
        
        const userId = ctx.identity.sub;
        const profile = ctx.result;
        
        if (!profile.userId) {
          profile.userId = userId;
        }
        
        if (!profile.username) {
          const email = profile.email || ctx.identity.claims?.['cognito:username'] || ctx.identity.claims?.email || '';
          if (email && email.includes('@')) {
            profile.username = email.split('@')[0];
          } else {
            profile.username = 'user';
          }
        }
        
        return profile;
      }
    `,
  });

  // Mutation: updateUserProfile - Update current user's profile
  api.addResolver("Mutation updateUserProfile", {
    dataSource: dynamoDataSource.name,
    code: `
      import { util } from '@aws-appsync/utils';
      
      export function request(ctx) {
        const userId = ctx.identity.sub;
        const input = ctx.args.input || {};
        
        const updateExpression = [];
        const expressionNames = {};
        const expressionValues = {};
        
        if (input.name !== undefined) {
          updateExpression.push('#name = :name');
          expressionNames['#name'] = 'name';
          expressionValues[':name'] = input.name;
        }
        
        if (input.bio !== undefined) {
          updateExpression.push('#bio = :bio');
          expressionNames['#bio'] = 'bio';
          expressionValues[':bio'] = input.bio;
        }
        
        if (input.avatar !== undefined) {
          updateExpression.push('#avatar = :avatar');
          expressionNames['#avatar'] = 'avatar';
          expressionValues[':avatar'] = input.avatar;
        }
        
        if (updateExpression.length === 0) {
          return util.error('No fields to update', 'ValidationError');
        }
        
        updateExpression.push('#updatedAt = :updatedAt');
        expressionNames['#updatedAt'] = 'updatedAt';
        expressionValues[':updatedAt'] = util.time.nowISO8601();
        
        return {
          operation: 'UpdateItem',
          key: util.dynamodb.toMapValues({
            PK: \`USER#\${userId}\`,
            SK: 'PROFILE'
          }),
          update: {
            expression: 'SET ' + updateExpression.join(', '),
            expressionNames: expressionNames,
            expressionValues: util.dynamodb.toMapValues(expressionValues)
          }
        };
      }
      
      export function response(ctx) {
        if (ctx.error) return util.error(ctx.error.message, ctx.error.type);
        
        const userId = ctx.identity.sub;
        
        // Fetch updated profile
        return {
          operation: 'GetItem',
          key: util.dynamodb.toMapValues({
            PK: \`USER#\${userId}\`,
            SK: 'PROFILE'
          })
        };
      }
    `,
  });
}
