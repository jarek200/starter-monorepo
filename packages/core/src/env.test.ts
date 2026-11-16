import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { validateLambdaEnv } from './env';

describe('validateLambdaEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('validates the table name and region', () => {
    process.env.TABLE_NAME = 'AppTable';
    process.env.AWS_REGION = 'eu-west-1';
    process.env.NODE_ENV = 'test';

    const result = validateLambdaEnv();
    expect(result.TABLE_NAME).toBe('AppTable');
    expect(result.AWS_REGION).toBe('eu-west-1');
    expect(result.NODE_ENV).toBe('test');
  });

  it('throws when TABLE_NAME is missing', () => {
    delete process.env.TABLE_NAME;
    expect(() => validateLambdaEnv()).toThrow(/TABLE_NAME/);
  });

  it('throws for an invalid NODE_ENV', () => {
    process.env.TABLE_NAME = 'AppTable';
    process.env.NODE_ENV = 'invalid';
    expect(() => validateLambdaEnv()).toThrow(/NODE_ENV/);
  });
});
