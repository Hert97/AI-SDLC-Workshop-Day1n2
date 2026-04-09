'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startAuthentication } from '@simplewebauthn/browser';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    setError('');
    if (!username) {
      setError('Username is required');
      return;
    }

    try {
      // 1. Get login options from server
      const optionsRes = await fetch('/api/auth/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      if (!optionsRes.ok) {
        const err = await optionsRes.json();
        throw new Error(err.error || 'Failed to get login options');
      }

      const options = await optionsRes.json();

      // 2. Start authentication with browser
      const assertion = await startAuthentication({ optionsJSON: options });

      // 3. Send assertion to server for verification
      const verificationRes = await fetch('/api/auth/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, cred: assertion }),
      });

      if (!verificationRes.ok) {
        const err = await verificationRes.json();
        throw new Error(err.error || 'Failed to verify login');
      }

      const { verified } = await verificationRes.json();

      if (verified) {
        router.push('/');
      } else {
        setError('Login failed');
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#1a2332' }}>
      <div style={{ backgroundColor: '#243447', border: '1px solid #2d4160' }} className="p-8 rounded-xl shadow-2xl w-full max-w-sm">
        <h1 className="text-3xl font-bold text-white mb-2">Todo App</h1>
        <p className="text-slate-400 text-sm mb-6">Sign in with your passkey</p>
        {error && (
          <div style={{ backgroundColor: '#7f1d1d33', border: '1px solid #991b1b' }} className="px-4 py-3 rounded-lg mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{ backgroundColor: '#1e2d3d', border: '1px solid #2d4160' }}
          className="w-full px-4 py-3 mb-4 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleLogin}
          style={{ backgroundColor: '#3b82f6' }}
          className="w-full py-3 text-white rounded-lg font-semibold hover:opacity-90 mb-4"
        >
          🔑 Login with Passkey
        </button>
        <p className="text-center text-slate-400 text-sm">
          No account?{' '}
          <a href="/register" style={{ color: '#60a5fa' }} className="hover:underline">Register</a>
        </p>
      </div>
    </div>
  );
}
