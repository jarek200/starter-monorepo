import {
  type GetMyProfileQuery,
  getMyProfileQuery,
  type UpdateUserInput,
  type UpdateUserProfileMutation,
  type User,
  updateUserProfileQuery,
} from '@sst-monorepo/graphql';
import { generateClient } from 'aws-amplify/api';
import { ensureAmplifyConfigured } from '../amplify';

type GraphQLRequest = {
  query: string;
  variables?: Record<string, unknown>;
};

type GraphQLClient = {
  graphql: (options: GraphQLRequest) => Promise<unknown>;
};

let client: GraphQLClient | null = null;
let clientPromise: Promise<GraphQLClient> | null = null;

async function getClient(): Promise<GraphQLClient> {
  if (client) return client;

  if (!clientPromise) {
    clientPromise = (async () => {
      if (typeof window === 'undefined') {
        throw new Error('GraphQL client cannot be created during SSR');
      }

      try {
        await ensureAmplifyConfigured();
        client = generateClient({ authMode: 'userPool' }) as GraphQLClient;
        return client;
      } catch (e) {
        clientPromise = null;
        const error = e instanceof Error ? e : new Error(String(e));
        throw new Error(`Failed to initialize GraphQL client: ${error.message}`);
      }
    })();
  }

  return clientPromise;
}

export function resetGraphQLClient(): void {
  client = null;
  clientPromise = null;
}

function readData<T>(result: unknown): T {
  if (!result || typeof result !== 'object' || !('data' in result)) {
    throw new Error('GraphQL request failed');
  }

  if ('errors' in result) {
    const errors = (result as { errors?: { message?: string }[] }).errors;
    if (errors?.length) {
      throw new Error(errors[0]?.message || 'GraphQL request failed');
    }
  }

  return (result as { data: T }).data;
}

export async function getMyProfile(): Promise<User | null> {
  const graphql = await getClient();
  const result = await graphql.graphql({ query: getMyProfileQuery });
  return readData<GetMyProfileQuery>(result).getMyProfile;
}

export async function updateUserProfile(input: UpdateUserInput): Promise<User | null> {
  const graphql = await getClient();
  const result = await graphql.graphql({
    query: updateUserProfileQuery,
    variables: { input },
  });
  return readData<UpdateUserProfileMutation>(result).updateUserProfile;
}
