import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import '../src/App.css'

export default function Header(){
    const [open, setOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const toggle = () => setOpen(v => !v)
    const close = () => setOpen(false)
    const location = useLocation()

    useEffect(() => {
        // close mobile menu whenever the route changes
        setOpen(false)
    }, [location])

    useEffect(() => {
        const hero = document.querySelector('.hero-video-container') || document.querySelector('.hero-demo') || document.querySelector('.hero')
        
        // Reset scrolled state if no hero section exists (on other pages)
        if (!hero) {
            setScrolled(true)
            return
        }

        // Reset scrolled state when hero is found (on home page)
        setScrolled(false)

        const io = new IntersectionObserver(([entry]) => {
            // when hero is not intersecting, we consider the page scrolled past hero
            setScrolled(!entry.isIntersecting)
        }, { root: null, threshold: 0.02 })

        io.observe(hero)
        return () => io.disconnect()
    }, [location])

    return(
        <header className={"site-header" + (scrolled ? ' scrolled' : '')}>
            <div className="header-inner">
                <div className="logo">Opulit</div>

                <nav className="main-nav">
                    <Link to="/">Home</Link>
                    <Link to="/features">Features</Link>
                    <Link to="/about">About</Link>
                    <Link to="/pricing">Pricing</Link>
                    <Link to="/contact">Contact</Link>
                </nav>

                <div className="actions">
                    <Link className="sign-in" to="/login">Sign in</Link>
                    <Link className="cta" to="/signup">Create account →</Link>

                    <button className="hamburger" aria-label="Open menu" aria-expanded={open} onClick={toggle}>
                        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                            <path d="M3 6h18M3 12h18M3 18h18" stroke="#2f3b46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className={"mobile-menu" + (open ? ' open' : '')} onClick={close} role="dialog" aria-hidden={!open}>
                <div className="mobile-menu-panel" onClick={e => e.stopPropagation()}>
                    <div className="mobile-menu-header">
                        <div className="logo">Opulit</div>
                        <button className="mobile-close" aria-label="Close menu" onClick={close}>
                            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                                <path d="M18 6L6 18M6 6l12 12" stroke="#2f3b46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                        </button>
                    </div>

                    <nav className="mobile-nav" role="menu">
                        <Link to="/" role="menuitem" onClick={close}>Home</Link>
                        <Link to="/features" role="menuitem" onClick={close}>Features</Link>
                        <Link to="/about" role="menuitem" onClick={close}>About</Link>
                        <Link to="/pricing" role="menuitem" onClick={close}>Pricing</Link>
                        <Link to="/contact" role="menuitem" onClick={close}>Contact</Link>
                    </nav>

                    <div className="mobile-actions">
                        <Link className="sign-in" to="/login" onClick={close}>Sign in</Link>
                        <Link className="cta" to="/signup" onClick={close}>Create account →</Link>
                    </div>
                </div>
            </div>
        </header>
    )
}