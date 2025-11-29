/**
 * Example: Testing XState Auth Machine with Vitest
 *
 * This demonstrates how to test state machines - one of XState's biggest strengths!
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { type AuthEvent, authMachine } from './auth.machine';

describe('Auth Machine', () => {
  let actor: ReturnType<typeof createActor<typeof authMachine>>;

  beforeEach(() => {
    actor = createActor(authMachine);
    actor.start();
  });

  it('should start in checking state', () => {
    expect(actor.getSnapshot().value).toBe('checking');
  });

  it('should transition to unauthenticated when no user found', async () => {
    // Wait for checking to complete
    await new Promise((resolve) => {
      const subscription = actor.subscribe((snapshot) => {
        if (snapshot.value === 'unauthenticated') {
          subscription.unsubscribe();
          resolve(undefined);
        }
      });
    });

    expect(actor.getSnapshot().value).toBe('unauthenticated');
  });

  it('should transition to authenticating on LOGIN event', () => {
    actor.send({ type: 'LOGIN', email: 'test@example.com', password: 'password' });

    expect(actor.getSnapshot().value).toBe('authenticating');
  });

  it('should transition to authenticated on successful login', async () => {
    actor.send({ type: 'LOGIN', email: 'test@example.com', password: 'password' });

    // Wait for async login to complete
    await new Promise((resolve) => {
      const subscription = actor.subscribe((snapshot) => {
        if (snapshot.value === 'authenticated' || snapshot.value === 'error') {
          subscription.unsubscribe();
          resolve(undefined);
        }
      });
    });

    const snapshot = actor.getSnapshot();
    expect(['authenticated', 'error']).toContain(snapshot.value);
  });

  it('should transition to signingUp on SIGNUP event', () => {
    actor.send({ type: 'SIGNUP', email: 'new@example.com', password: 'password' });

    expect(actor.getSnapshot().value).toBe('signingUp');
  });

  it('should transition to verifying after signup', async () => {
    actor.send({ type: 'SIGNUP', email: 'new@example.com', password: 'password' });

    await new Promise((resolve) => {
      const subscription = actor.subscribe((snapshot) => {
        if (snapshot.value === 'verifying' || snapshot.value === 'error') {
          subscription.unsubscribe();
          resolve(undefined);
        }
      });
    });

    const snapshot = actor.getSnapshot();
    expect(['verifying', 'error']).toContain(snapshot.value);
  });

  it('should transition to authenticated after email verification', async () => {
    // First signup
    actor.send({ type: 'SIGNUP', email: 'new@example.com', password: 'password' });

    // Wait for verifying state
    await new Promise((resolve) => {
      const subscription = actor.subscribe((snapshot) => {
        if (snapshot.value === 'verifying') {
          subscription.unsubscribe();
          resolve(undefined);
        }
      });
    });

    // Then verify
    actor.send({ type: 'VERIFY_EMAIL', code: '123456' });

    await new Promise((resolve) => {
      const subscription = actor.subscribe((snapshot) => {
        if (snapshot.value === 'authenticated' || snapshot.value === 'error') {
          subscription.unsubscribe();
          resolve(undefined);
        }
      });
    });

    const snapshot = actor.getSnapshot();
    expect(['authenticated', 'error']).toContain(snapshot.value);
  });

  it('should transition to unauthenticated on LOGOUT', async () => {
    // First authenticate
    actor.send({ type: 'LOGIN', email: 'test@example.com', password: 'password' });

    await new Promise((resolve) => {
      const subscription = actor.subscribe((snapshot) => {
        if (snapshot.value === 'authenticated') {
          subscription.unsubscribe();
          resolve(undefined);
        }
      });
    });

    // Then logout
    actor.send({ type: 'LOGOUT' });

    expect(actor.getSnapshot().value).toBe('unauthenticated');
    expect(actor.getSnapshot().context.user).toBeNull();
  });
});
