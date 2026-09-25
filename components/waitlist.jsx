import { useNavigate } from 'react-router-dom'
import { useAuth } from '../src/context/useAuth'
import '../css/waitlist.css'

export default function Waitlist() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <main className="waitlist-page">
      <section className="waitlist-card" aria-labelledby="waitlist-title">
        <p className="waitlist-brand">OPULIT</p>
        <p className="waitlist-mark" aria-hidden="true">✦</p>
        <h1 id="waitlist-title">You’re on the waitlist! 🎉</h1>
        <p>We’re building OPULIT and you’ll be one of the first to know when it’s ready.</p>
        {user?.email && <p className="waitlist-email">We’ll send updates to {user.email}.</p>}
        <div className="waitlist-actions">
          <button type="button" className="waitlist-home-button" onClick={() => navigate('/')}><span aria-hidden="true">←</span> Back to home</button>
          <button type="button" className="waitlist-logout-button" onClick={handleSignOut}>Log out</button>
        </div>
      </section>
    </main>
  )
}