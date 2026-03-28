/** Fail fast when a Lambda env var is missing (avoids non-null assertions). */
export function requiredEnv(name: string): string {
  const v = process.env[name];
  if (v === undefined || v === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}
