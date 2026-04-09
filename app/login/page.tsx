'use client';

import { useState } from 'react';
import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!username.trim()) { setError('Username is required'); return; }
    setLoading(true);
    setError('');
    try {
      const optRes = await fetch('/api/auth/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });
      if (!optRes.ok) { setError((await optRes.json()).error ?? 'Registration failed'); return; }
      const opts = await optRes.json();

      const credential = await startRegistration({ optionsJSON: opts });

      const verRes = await fetch('/api/auth/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), credential }),
      });
      if (!verRes.ok) { setError((await verRes.json()).error ?? 'Verification failed'); return; }
      const { verified } = await verRes.json();
      if (verified) window.location.href = '/';
      else setError('Registration not verified');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    if (!username.trim()) { setError('Username is required'); return; }
    setLoading(true);
    setError('');
    try {
      const optRes = await fetch('/api/auth/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });
      if (!optRes.ok) { setError((await optRes.json()).error ?? 'Login failed'); return; }
      const opts = await optRes.json();

      const credential = await startAuthentication({ optionsJSON: opts });

      const verRes = await fetch('/api/auth/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), credential }),
      });
      if (!verRes.ok) { setError((await verRes.json()).error ?? 'Verification failed'); return; }
      const { verified } = await verRes.json();
      if (verified) window.location.href = '/';
      else setError('Login not verified');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-gray-800 dark:to-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800 dark:text-white">
          Todo App
        </h1>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-8 text-sm">
          Passwordless login with Passkeys
        </p>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="username-input"
          />

          {error && (
            <p className="text-red-500 text-sm" role="alert" data-testid="auth-error">
              {error}
            </p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg
                       disabled:opacity-50 transition-colors"
            data-testid="login-button"
          >
            {loading ? 'Authenticating…' : '🔑 Login with Passkey'}
          </button>

          <div className="relative flex items-center gap-2">
            <div className="flex-1 border-t border-gray-200 dark:border-gray-600" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 border-t border-gray-200 dark:border-gray-600" />
          </div>

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg
                       disabled:opacity-50 transition-colors"
            data-testid="register-button"
          >
            {loading ? 'Registering…' : '✨ Register New Account'}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Uses your device&apos;s biometrics or security key — no passwords needed.
        </p>
      </div>
    </div>
  );
}
