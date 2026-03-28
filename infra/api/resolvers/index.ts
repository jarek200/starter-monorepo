/// <reference path="../../../.sst/platform/config.d.ts" />

import { addProjectResolvers } from './projects';
import { addUserResolvers } from './users';

export function addAllResolvers(
  api: ReturnType<typeof import('../api-setup').createApi>,
  dynamoDataSource: ReturnType<typeof import('../api-setup').createDataSource>,
  lambdaDataSource: ReturnType<typeof import('../api-setup').createLambdaDataSource>,
  tableName: string
) {
  addUserResolvers(api, dynamoDataSource, tableName);
  addProjectResolvers(api, dynamoDataSource, lambdaDataSource, tableName);
}
