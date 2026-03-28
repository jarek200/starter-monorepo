let isConfigured = false;
let initPromise: Promise<boolean> | null = null;

/**
 * Returns true when Amplify is configured (env vars present + running in browser).
 * Returns false in local-only / mock mode (no env vars).
 */
export async function ensureAmplifyConfigured(): Promise<boolean> {
  if (isConfigured) return true;
  if (initPromise) return initPromise;
  initPromise = initializeAmplify();
  return initPromise;
}

async function initializeAmplify(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const { Amplify } = await import('aws-amplify');

  interface WindowWithEnv extends Window {
    ENV?: Record<string, string>;
    __ADMIN_AMPLIFY_CONFIGURED__?: boolean;
  }
  const win = window as WindowWithEnv;

  if (win.__ADMIN_AMPLIFY_CONFIGURED__) {
    isConfigured = true;
    return true;
  }

  const env = win.ENV || import.meta.env;
  const userPoolId = env.VITE_USER_POOL_ID;
  const userPoolClientId = env.VITE_USER_POOL_CLIENT_ID;
  const graphqlEndpoint = env.VITE_GRAPHQL_ENDPOINT;
  const region = env.VITE_AWS_REGION || 'us-east-1';

  if (!userPoolId || !userPoolClientId || !graphqlEndpoint) {
    console.info('[Admin Amplify] No env vars — running in local mock mode');
    return false;
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: { email: true },
      },
    },
    API: {
      GraphQL: {
        endpoint: graphqlEndpoint,
        region,
        defaultAuthMode: 'userPool',
      },
    },
  });

  win.__ADMIN_AMPLIFY_CONFIGURED__ = true;
  isConfigured = true;
  console.log('[Admin Amplify] Configured ✅');
  return true;
}

/** True when SST env vars are present — used to switch between real/mock mode */
export function isLiveMode(): boolean {
  if (typeof window === 'undefined') return false;
  interface WindowWithEnv extends Window {
    ENV?: Record<string, string>;
  }
  const env = (window as WindowWithEnv).ENV || import.meta.env;
  return !!(env.VITE_USER_POOL_ID && env.VITE_USER_POOL_CLIENT_ID && env.VITE_GRAPHQL_ENDPOINT);
}
