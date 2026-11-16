import { Amplify } from 'aws-amplify';

let amplifyInitPromise: Promise<void> | null = null;
let isConfigured = false;

export async function ensureAmplifyConfigured(): Promise<void> {
  if (isConfigured) return;
  if (amplifyInitPromise) return amplifyInitPromise;

  amplifyInitPromise = initializeAmplify().catch((error) => {
    amplifyInitPromise = null;
    throw error;
  });
  await amplifyInitPromise;
}

async function initializeAmplify(): Promise<void> {
  if (typeof window === 'undefined') return;

  const env = import.meta.env;

  if (
    !env.VITE_USER_POOL_ID ||
    !env.VITE_USER_POOL_CLIENT_ID ||
    !env.VITE_GRAPHQL_ENDPOINT ||
    !env.VITE_AWS_REGION
  ) {
    throw new Error('Amplify configuration failed: missing required environment variables');
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: env.VITE_USER_POOL_ID,
        userPoolClientId: env.VITE_USER_POOL_CLIENT_ID,
        loginWith: { email: true, username: true },
      },
    },
    API: {
      GraphQL: {
        endpoint: env.VITE_GRAPHQL_ENDPOINT,
        region: env.VITE_AWS_REGION,
        defaultAuthMode: 'userPool',
      },
    },
  });

  isConfigured = true;
}

export default Amplify;
