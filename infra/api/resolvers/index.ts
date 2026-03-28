/// <reference path="../../../.sst/platform/config.d.ts" />

import { addUserResolvers } from './users';
import { addProjectResolvers } from './projects';

export function addAllResolvers(
  api: ReturnType<typeof import('../api-setup').createApi>,
  dynamoDataSource: ReturnType<typeof import('../api-setup').createDataSource>,
  lambdaDataSource: ReturnType<typeof import('../api-setup').createLambdaDataSource>,
  tableName: string
) {
  addUserResolvers(api, dynamoDataSource, tableName);
  addProjectResolvers(api, dynamoDataSource, lambdaDataSource, tableName);
}
