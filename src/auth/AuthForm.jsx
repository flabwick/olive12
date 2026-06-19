import { useState } from 'react'
import './AuthForm.css'

export function AuthForm({ onSignIn, onSignUp, error = '', loading = false }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <div className="auth-form">
      <h1 className="auth-form__title">olive12</h1>
      <div className="auth-form__fields">
        <label htmlFor="auth-email">Email</label>
        <input
          id="auth-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
          disabled={loading}
        />
        <label htmlFor="auth-password">Password</label>
        <input
          id="auth-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="••••••••"
          disabled={loading}
        />
      </div>
      {error && (
        <p className="auth-form__error" role="alert">{error}</p>
      )}
      <div className="auth-form__actions">
        <button
          type="button"
          onClick={() => onSignIn(email, password)}
          disabled={loading || !email || !password}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => onSignUp(email, password)}
          disabled={loading || !email || !password}
        >
          Sign up
        </button>
      </div>
    </div>
  )
}
