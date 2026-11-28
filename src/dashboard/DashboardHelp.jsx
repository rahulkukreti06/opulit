import { useEffect, useRef, useState } from 'react'
import { CircleHelp } from 'lucide-react'

export default function DashboardHelp() {
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [showUpdates, setShowUpdates] = useState(false)
  const container = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function onPointerDown(event) { if (!container.current?.contains(event.target)) { setOpen(false); setPinned(false); setShowUpdates(false) } }
    function onKeyDown(event) { if (event.key === 'Escape') { setOpen(false); setPinned(false); setShowUpdates(false); container.current?.querySelector('button')?.focus() } }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('pointerdown', onPointerDown); document.removeEventListener('keydown', onKeyDown) }
  }, [open])

  return <div className="dashboard-help" ref={container} onMouseEnter={() => setOpen(true)} onMouseLeave={() => { if (!pinned) { setOpen(false); setShowUpdates(false) } }}>
    <button className="dashboard-icon-button" type="button" aria-label="Help" aria-expanded={open} aria-controls="dashboard-help-menu" onClick={() => { setPinned(true); setOpen(true); setShowUpdates(false) }}><CircleHelp size={20} strokeWidth={2} /></button>
    {open && <div className="dashboard-help-menu" id="dashboard-help-menu">
      {showUpdates ? <><strong>What’s New</strong><p>Product updates will appear here when available.</p><button type="button" onClick={() => setShowUpdates(false)}>← Back to help</button></> : <>
        <strong>Help &amp; support</strong>
        <a href="/contact"><span>Contact Support</span><small>Get assistance with problems.</small></a>
        <a href="mailto:mail@opulit.com?subject=Bug%20report"><span>Report a Bug</span><small>Report technical issues.</small></a>
        <a href="mailto:mail@opulit.com?subject=Feature%20request"><span>Request a Feature</span><small>Share your suggestions.</small></a>
        <button type="button" onClick={() => setShowUpdates(true)}><span>What’s New</span><small>See recent product updates.</small></button>
      </>}
    </div>}
  </div>
}
