'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
        const payload = (await optionResponse.json()) as { error?: string };
        throw new Error(payload.error ?? `Failed to fetch ${mode} options`);
      }

      const verifyResponse = await fetch(`/api/auth/${mode}-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      if (!verifyResponse.ok) {
        const payload = (await verifyResponse.json()) as { error?: string };
        throw new Error(payload.error ?? `${mode} verification failed`);
      }

      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown auth error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <section
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--surface)',
          borderRadius: 18,
          padding: 24,
          boxShadow: '0 20px 45px rgba(36, 62, 35, 0.12)',
        }}
      >
        <h1 style={{ marginTop: 0 }}>Passkey Login</h1>
        <p style={{ color: 'var(--muted)' }}>Register once, then login using your username.</p>

        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ width: '100%', padding: 12, marginTop: 6, marginBottom: 16, borderRadius: 8, border: '1px solid #d2dcc4' }}
        />

        {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : null}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => auth('register')} disabled={loading || !username.trim()} style={{ padding: '10px 14px', borderRadius: 8 }}>
            Register
          </button>
          <button onClick={() => auth('login')} disabled={loading || !username.trim()} style={{ padding: '10px 14px', borderRadius: 8 }}>
            Login
          </button>
        </div>
      </section>
    </main>
  );
}
