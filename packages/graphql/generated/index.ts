export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type CreateProjectInput = {
  accounts: Array<ProjectAccountInput>;
  awsSignInUrl?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  githubOrg?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  slug: Scalars['String']['input'];
  templateRepo?: InputMaybe<Scalars['String']['input']>;
  websiteUrl?: InputMaybe<Scalars['String']['input']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  createProject: Project;
  deleteProject: Scalars['Boolean']['output'];
  updateProject: Project;
  updateUserProfile?: Maybe<User>;
};


export type MutationCreateProjectArgs = {
  input: CreateProjectInput;
};


export type MutationDeleteProjectArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUpdateProjectArgs = {
  id: Scalars['ID']['input'];
  input: UpdateProjectInput;
};


export type MutationUpdateUserProfileArgs = {
  input: UpdateUserInput;
};

export type Project = {
  __typename?: 'Project';
  accounts: Array<ProjectAccount>;
  awsSignInUrl?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  executionArn?: Maybe<Scalars['String']['output']>;
  githubOrg?: Maybe<Scalars['String']['output']>;
  githubUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  provisioningPhase: ProvisioningPhase;
  provisioningProgress?: Maybe<Scalars['Int']['output']>;
  slug: Scalars['String']['output'];
  templateRepo?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
  userId: Scalars['String']['output'];
  websiteUrl?: Maybe<Scalars['String']['output']>;
};

export type ProjectAccount = {
  __typename?: 'ProjectAccount';
  accountId?: Maybe<Scalars['String']['output']>;
  awsSignInUrl?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  name: Scalars['String']['output'];
  roleArn?: Maybe<Scalars['String']['output']>;
};

export type ProjectAccountInput = {
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type ProvisioningPhase =
  | 'ACCOUNTS'
  | 'BILLING'
  | 'DONE'
  | 'DRAFT'
  | 'FAILED'
  | 'GITHUB';

export type Query = {
  __typename?: 'Query';
  getMyProfile?: Maybe<User>;
  getProject?: Maybe<Project>;
  listProjects: Array<Project>;
};


export type QueryGetProjectArgs = {
  id: Scalars['ID']['input'];
};

export type UpdateProjectInput = {
  awsSignInUrl?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  githubUrl?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  websiteUrl?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateUserInput = {
  avatar?: InputMaybe<Scalars['String']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
  __typename?: 'User';
  avatar?: Maybe<Scalars['String']['output']>;
  bio?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  email: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
  username: Scalars['String']['output'];
};
