import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib/supabase'
import '../css/login.css'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function handleSubmit(event) {
    event.preventDefault(); setLoading(true); setMessage(''); setError('')
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
    if (resetError) setError(resetError.message); else setMessage('Check your inbox for a password reset link.')
    setLoading(false)
  }
  return <div className="login-page"><div className="login-content"><div className="login-left">
    <Link to="/login" className="back-to-home">Back to sign in</Link>
    <div className="login-header"><h1>Reset your password</h1><p>We will send a secure reset link to your email.</p></div>
    <form className="login-form" onSubmit={handleSubmit}><div className="form-group"><label htmlFor="reset-email">Email Address</label><input id="reset-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="Enter your email address" /></div>
      {error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="auth-success" role="status">{message}</p>}<button type="submit" className="login-button" disabled={loading}>{loading ? 'Sending...' : 'Send reset link'}</button>
    </form>
  </div><div className="login-right"><img src="/login-image.avif" alt="Business management" /></div></div></div>
}