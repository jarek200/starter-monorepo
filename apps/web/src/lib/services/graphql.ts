/**
 * GraphQL Service
 * Handles all GraphQL queries and mutations to AWS AppSync
 */

import { generateClient } from 'aws-amplify/api';
import type { GraphQLResult } from '@aws-amplify/api-graphql';
import { ensureAmplifyConfigured } from '../amplify';

// Lazy client initialization
let client: any = null;
let clientPromise: Promise<any> | null = null;

async function getClient() {
  if (client) return client;
  
  if (!clientPromise) {
    clientPromise = (async () => {
      if (typeof window === 'undefined') {
        throw new Error('GraphQL client cannot be created during SSR');
      }

      try {
        await ensureAmplifyConfigured();
        client = generateClient({ authMode: 'userPool' });
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

// Reset GraphQL client state
export function resetGraphQLClient(): void {
  client = null;
  clientPromise = null;
}

// User Queries
export async function getMyProfile() {
  const query = `
    query GetMyProfile {
      getMyProfile {
        userId
        username
        email
        name
        bio
        createdAt
        updatedAt
      }
    }
  `;

  const client = await getClient();
  const result = await client.graphql({
    query,
  }) as GraphQLResult<any>;

  if (result.errors) {
    throw new Error(result.errors[0]?.message || 'Failed to get profile');
  }

  return result.data?.getMyProfile || null;
}

// User Mutations
export async function updateUserProfile(input: { name?: string; bio?: string; avatar?: string }) {
  const mutation = `
    mutation UpdateUserProfile($input: UpdateUserInput!) {
      updateUserProfile(input: $input) {
        userId
        username
        email
        name
        bio
        avatar
        createdAt
        updatedAt
      }
    }
  `;

  const client = await getClient();
  const result = await client.graphql({
    query: mutation,
    variables: { input },
  }) as GraphQLResult<any>;

  if (result.errors) {
    throw new Error(result.errors[0]?.message || 'Failed to update profile');
  }

  return result.data?.updateUserProfile || null;
}
