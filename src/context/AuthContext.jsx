import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (mounted) { setSession(currentSession); setLoading(false) }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession)
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  const signUp = (email, password, fullName, businessName) => supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, business_name: businessName } } })
  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signInWithGoogle = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/waitlist` } })
  const signOut = () => supabase.auth.signOut()

  return <AuthContext.Provider value={{ user: session?.user ?? null, session, loading, signUp, signIn, signInWithGoogle, signOut }}>{children}</AuthContext.Provider>
}

