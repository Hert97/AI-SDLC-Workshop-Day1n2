'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function auth(mode: 'register' | 'login') {
    setLoading(true);
    setError(null);

    try {
      const optionResponse = await fetch(`/api/auth/${mode}-options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      if (!optionResponse.ok) {
        const payload = await readJson<{ error?: string }>(optionResponse);
        throw new Error(payload?.error ?? `Failed to fetch ${mode} options`);
      }

      const verifyResponse = await fetch(`/api/auth/${mode}-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      if (!verifyResponse.ok) {
        const payload = await readJson<{ error?: string }>(verifyResponse);
        throw new Error(payload?.error ?? `${mode} verification failed`);
      }

      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown auth error');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void auth('login');
  }

  return (
    <main className="login-shell">
      <div className="login-grid">
        <section className="panel panel-soft login-hero">
          <span className="eyebrow">Todo App</span>
          <h1>Sign in with your passkey.</h1>
          <p className="hero-text">
            Use your username, then let your device handle the secure biometric or PIN step. The layout follows a calm,
            auth-first flow similar to the deployed reference.
          </p>

          <ul className="feature-list">
            <li>No passwords to remember.</li>
            <li>Recurring tasks, reminders, exports, and calendar views stay in one workspace.</li>
            <li>Authentication is protected by device-backed passkeys and server-side sessions.</li>
          </ul>
        </section>

        <section className="panel panel-elevated auth-card">
          <span className="eyebrow">Passkey access</span>
          <h2>Username first, then continue with your device.</h2>
          <p className="helper-copy">Press Enter to sign in, or register once if this is a new account.</p>

          <form onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="username">
              Username
              <input
                className="control"
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. yagami"
                autoComplete="username"
              />
            </label>

            {error ? <p className="error-banner">{error}</p> : null}

            <div className="button-row">
              <button className="primary-button" disabled={loading || !username.trim()} type="submit">
                {loading ? 'Working...' : 'Sign in with Passkey'}
              </button>
              <button className="secondary-button" disabled={loading || !username.trim()} onClick={() => void auth('register')} type="button">
                Register
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
