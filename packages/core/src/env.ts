import { z } from 'zod';

/**
 * Environment variable validation schema
 * Use this to validate environment variables at runtime
 */
export const envSchema = z.object({
  // AWS Configuration
  AWS_REGION: z.string().default('us-east-1'),
  VITE_AWS_REGION: z.string().optional(),

  // Cognito
  VITE_USER_POOL_ID: z.string().optional(),
  VITE_USER_POOL_CLIENT_ID: z.string().optional(),

  // AppSync
  VITE_GRAPHQL_ENDPOINT: z.string().url().optional(),

  // DynamoDB
  VITE_TABLE_NAME: z.string().optional(),

  // Stage
  VITE_STAGE: z.enum(['dev', 'staging', 'production']).optional(),

  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates and returns environment variables
 * Throws an error if validation fails
 */
export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.errors.map((e) => e.path.join('.')).join(', ');
      throw new Error(`Missing or invalid environment variables: ${missing}`);
    }
    throw error;
  }
}

/**
 * Safe environment variable access with defaults
 * Use this in client-side code where env vars might be undefined
 */
export function getEnv(): Partial<Env> {
  try {
    return envSchema.partial().parse(process.env);
  } catch {
    return {};
  }
}
