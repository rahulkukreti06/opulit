import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/useAuth';
import '../css/signup.css';

export default function Signup() {
    const { user, loading, signUp, signInWithGoogle } = useAuth();
    const navigate = useNavigate();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    if (loading) return <div className="auth-loading">Loading...</div>;
    if (user) return <Navigate to="/waitlist" replace />;
    async function handleSubmit(event) {
        event.preventDefault(); setError(''); setMessage(''); setSubmitting(true);
        const { data, error: signUpError } = await signUp(email, password, fullName, businessName);
        if (signUpError) setError(signUpError.message);
        else if (data.session) navigate('/waitlist', { replace: true });
        else setMessage('Account created. Check your email to confirm your account, then sign in.');
        setSubmitting(false);
    }
    async function handleGoogle() {
        setError(''); setSubmitting(true);
        const { error: googleError } = await signInWithGoogle();
        if (googleError) { setError(googleError.message); setSubmitting(false); }
    }
    return (
        <div className="signup-page">
            <div className="signup-content">
                <div className="signup-left">
                    <a href="/" className="back-to-home">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15 18L9 12L15 6" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Back to home
                    </a>
                    <div className="signup-header">
                        <h1>Get started with Opulit</h1>
                        <p>Manage your business without the chaos. Sign up in seconds.</p>
                    </div>
                    <form className="signup-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="fullName">Full Name</label>
                            <input type="text" id="fullName" name="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Enter your full name" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input type="email" id="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email address" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input type="password" id="password" name="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Create a password" minLength="6" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="businessName">Business Name</label>
                            <input type="text" id="businessName" name="businessName" value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="Enter your business name" />
                        </div>
                        {error && <p className="auth-error" role="alert">{error}</p>}
                        {message && <p className="auth-success" role="status">{message}</p>}
                        <button type="submit" className="signup-button" disabled={submitting}>{submitting ? 'Creating account...' : 'Create Account'}</button>
                        
                        <div className="social-divider">
                            <span>or sign up with</span>
                        </div>
                        
                        <div className="social-buttons">
                            <button type="button" className="social-button google-button" onClick={handleGoogle} disabled={submitting}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                </svg>
                                Sign up with Google
                            </button>
                            <button type="button" className="social-button apple-button">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                                </svg>
                                Sign up with Apple
                            </button>
                        </div>
                        
                        <p className="login-link">Already have an account? <Link to="/login">Log in</Link></p>
                    </form>
                </div>
                <div className="signup-right">
                    <img src="/login-image.avif" alt="Business management" />
                    <div className="signup-image-copy">
                        <span className="signup-image-brand">Opulit</span>
                        <figure className="signup-testimonial">
                            <blockquote>“Opulit gives me a clear view of my business, without the busywork.”</blockquote>
                            <figcaption>— A growing business owner</figcaption>
                        </figure>
                    </div>
                </div>
            </div>
        </div>
    )
}
