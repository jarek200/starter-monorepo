/**
 * Admin GraphQL service
 *
 * Wraps AppSync queries/mutations for project management.
 * Only active when SST env vars are present (live mode).
 * In local/mock mode the dashboard uses in-memory state directly.
 */

import type { GraphQLResult } from '@aws-amplify/api-graphql';
import { ensureAmplifyConfigured } from '../amplify';

// biome-ignore lint/suspicious/noExplicitAny: Amplify client type is internal
let _client: any = null;

async function getClient() {
  if (_client) return _client;
  await ensureAmplifyConfigured();
  const { generateClient } = await import('aws-amplify/api');
  _client = generateClient({ authMode: 'userPool' });
  return _client;
}

export function resetClient() {
  _client = null;
}

// ─── Types mirrored from GraphQL schema ──────────────────────────────────────

export type ProvisioningPhase = 'DRAFT' | 'BILLING' | 'ACCOUNTS' | 'GITHUB' | 'DONE' | 'FAILED';

export interface ProjectAccount {
  name: string;
  email: string;
  accountId: string | null;
  roleArn: string | null;
  awsSignInUrl: string | null;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description: string | null;
  templateRepo: string | null;
  githubOrg: string | null;
  accounts: ProjectAccount[];
  provisioningPhase: ProvisioningPhase;
  provisioningProgress: number;
  executionArn: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  awsSignInUrl: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  slug: string;
  description?: string;
  templateRepo?: string;
  githubOrg?: string;
  accounts: Array<{ name: string; email: string }>;
  websiteUrl?: string;
  awsSignInUrl?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  websiteUrl?: string;
  awsSignInUrl?: string;
  githubUrl?: string;
}

export interface GithubRepoOption {
  fullName: string;
  name: string;
  isTemplate: boolean;
  private: boolean;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

const PROJECT_FIELDS = `
  id userId name slug description templateRepo githubOrg
  provisioningPhase provisioningProgress executionArn
  githubUrl websiteUrl awsSignInUrl error createdAt updatedAt
  accounts { name email accountId roleArn awsSignInUrl }
`;

export async function listProjects(): Promise<Project[]> {
  const client = await getClient();
  const result = (await client.graphql({
    query: `query ListProjects { listProjects { ${PROJECT_FIELDS} } }`,
  })) as GraphQLResult<{ listProjects: Project[] }>;

  if (result.errors?.length) throw new Error(result.errors[0]?.message);
  return result.data?.listProjects ?? [];
}

export async function listGithubReposForTemplate(): Promise<GithubRepoOption[]> {
  const client = await getClient();
  const result = (await client.graphql({
    query: `query ListGithubReposForTemplate {
      listGithubReposForTemplate { fullName name isTemplate private }
    }`,
  })) as GraphQLResult<{ listGithubReposForTemplate: GithubRepoOption[] }>;

  if (result.errors?.length) throw new Error(result.errors[0]?.message);
  return result.data?.listGithubReposForTemplate ?? [];
}

export async function getProject(id: string): Promise<Project | null> {
  const client = await getClient();
  const result = (await client.graphql({
    query: `query GetProject($id: ID!) { getProject(id: $id) { ${PROJECT_FIELDS} } }`,
    variables: { id },
  })) as GraphQLResult<{ getProject: Project | null }>;

  if (result.errors?.length) throw new Error(result.errors[0]?.message);
  return result.data?.getProject ?? null;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const client = await getClient();
  const result = (await client.graphql({
    query: `
      mutation CreateProject($input: CreateProjectInput!) {
        createProject(input: $input) { ${PROJECT_FIELDS} }
      }
    `,
    variables: { input },
  })) as GraphQLResult<{ createProject: Project }>;

  if (result.errors?.length) throw new Error(result.errors[0]?.message);
  return result.data!.createProject;
}

export async function updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
  const client = await getClient();
  const result = (await client.graphql({
    query: `
      mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
        updateProject(id: $id, input: $input) { ${PROJECT_FIELDS} }
      }
    `,
    variables: { id, input },
  })) as GraphQLResult<{ updateProject: Project }>;

  if (result.errors?.length) throw new Error(result.errors[0]?.message);
  return result.data!.updateProject;
}

export async function deleteProject(id: string): Promise<boolean> {
  const client = await getClient();
  const result = (await client.graphql({
    query: `mutation DeleteProject($id: ID!) { deleteProject(id: $id) }`,
    variables: { id },
  })) as GraphQLResult<{ deleteProject: boolean }>;

  if (result.errors?.length) throw new Error(result.errors[0]?.message);
  return result.data?.deleteProject ?? false;
}
