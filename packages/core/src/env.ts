import { type ZodError, type ZodIssue, z } from 'zod';

export const lambdaEnvSchema = z.object({
  TABLE_NAME: z.string(),
  AWS_REGION: z.string().default('eu-west-1'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
});

export type LambdaEnv = z.infer<typeof lambdaEnvSchema>;

export function validateLambdaEnv(): LambdaEnv {
  try {
    return lambdaEnvSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as ZodError<unknown>;
      const missing = zodError.issues.map((e: ZodIssue) => e.path.join('.')).join(', ');
      throw new Error(`Missing or invalid Lambda environment variables: ${missing}`);
    }
    throw error;
  }
}
