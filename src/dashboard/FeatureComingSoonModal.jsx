import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell, X } from 'lucide-react'

export default function FeatureComingSoonModal({ feature, onClose }) {
  const closeButtonRef = useRef(null)
  const [isNotified, setIsNotified] = useState(false)

  useEffect(() => {
    closeButtonRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return createPortal(<div className="feature-coming-soon-backdrop" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose()
  }}>
    <section className="feature-coming-soon-modal" role="dialog" aria-modal="true" aria-labelledby="feature-coming-soon-title">
      <button ref={closeButtonRef} className="feature-coming-soon-close" type="button" aria-label="Close dialog" onClick={onClose}>
        <X size={18} strokeWidth={2} />
      </button>
      <div className="feature-coming-soon-illustration">
        <img src="/Modern Rocket Launch in the Clouds.png" alt="" />
      </div>
      <h2 id="feature-coming-soon-title">Feature Coming Soon</h2>
      <p>We're working on the {feature} module to help you manage your team, roles and attendance.</p>
      <div className="feature-coming-soon-actions">
        <button className="feature-coming-soon-dismiss" type="button" onClick={onClose}>Got It</button>
        <button className="feature-coming-soon-notify" type="button" onClick={() => setIsNotified(true)} disabled={isNotified}>
          <Bell size={14} strokeWidth={2} />
          {isNotified ? "We'll let you know!" : 'Notify Me When It’s Ready'}
        </button>
      </div>
    </section>
  </div>, document.body)
}
