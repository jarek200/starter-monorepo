import { print } from 'graphql';
import { GetMyProfileDocument, UpdateUserProfileDocument } from './generated/operations';

export { GetMyProfileDocument, UpdateUserProfileDocument };
export const getMyProfileQuery = print(GetMyProfileDocument);
export const updateUserProfileQuery = print(UpdateUserProfileDocument);
export type {
  GetMyProfileQuery,
  GetMyProfileQueryVariables,
  UpdateUserProfileMutation,
  UpdateUserProfileMutationVariables,
  UserFieldsFragment,
} from './generated/operations';
export * from './generated/types';
