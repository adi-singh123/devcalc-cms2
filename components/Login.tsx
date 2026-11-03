"use client";

import { useState } from "react";

export default function Login({ error: serverError }: { error?: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(serverError ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // Progressive enhancement: if JS runs, use fetch for smooth login
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        window.location.reload();
      } else {
        setError(data?.error ?? "Incorrect password. Please try again.");
        setLoading(false);
      }
    } catch {
      // Fallback to regular form submission if fetch experiences any network issue
      const form = event.currentTarget;
      form.submit();
    }
  }

  return (
    <>
      <header>
        <strong>DevCalc CMS</strong>
      </header>
      <main style={{ maxWidth: 480 }}>
        <form
          className="card stack"
          action="/api/session"
          method="post"
          onSubmit={handleSubmit}
        >
          <h1>Private sign-in</h1>
          <p className="muted">
            Only the site owner can edit content. There is no public registration.
          </p>
          <label>
            Admin password
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Enter password..."
              required
              disabled={loading}
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="primary" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </main>
    </>
  );
}
