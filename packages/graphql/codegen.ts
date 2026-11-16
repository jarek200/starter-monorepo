import type { CodegenConfig } from '@graphql-codegen/cli';

const scalars = {
  ID: 'string',
  String: 'string',
  Int: 'number',
  Float: 'number',
  Boolean: 'boolean',
  AWSDateTime: 'string',
  AWSDate: 'string',
  AWSTime: 'string',
  AWSTimestamp: 'number',
  AWSEmail: 'string',
  AWSJSON: 'string',
  AWSURL: 'string',
  AWSPhone: 'string',
  AWSIPAddress: 'string',
};

const config: CodegenConfig = {
  schema: './schema.graphql',
  documents: './operations.graphql',
  generates: {
    './generated/types.ts': {
      plugins: ['typescript'],
      config: {
        enumsAsTypes: true,
        constEnums: true,
        inputMaybeValue: 'T | null | undefined',
        skipTypename: false,
        scalars,
      },
    },
    './generated/operations.ts': {
      plugins: ['typescript-operations', 'typed-document-node'],
      config: {
        useTypeImports: true,
        preResolveTypes: true,
        skipTypename: false,
        exportFragmentSpreadSubTypes: true,
        scalars,
      },
    },
  },
};

export default config;
