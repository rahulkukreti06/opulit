import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import '../css/login.css'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  async function handleSubmit(event) {
    event.preventDefault(); setError(''); setMessage(''); setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) setError(updateError.message)
    else { setMessage('Your password has been updated.'); setTimeout(() => navigate('/dashboard', { replace: true }), 700) }
    setLoading(false)
  }
  return <div className="login-page"><div className="login-content"><div className="login-left">
    <Link to="/login" className="back-to-home">Back to sign in</Link>
    <div className="login-header"><h1>Choose a new password</h1><p>Use a password you do not use elsewhere.</p></div>
    <form className="login-form" onSubmit={handleSubmit}><div className="form-group"><label htmlFor="new-password">New password</label><input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength="6" required /></div>
      {error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="auth-success" role="status">{message}</p>}<button type="submit" className="login-button" disabled={loading}>{loading ? 'Updating...' : 'Update password'}</button>
    </form>
  </div><div className="login-right"><img src="/login-image.avif" alt="Business management" /></div></div></div>
}