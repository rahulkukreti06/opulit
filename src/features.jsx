import '../css/features.css'
import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { FiBarChart2, FiBell, FiBox, FiMessageCircle, FiShield, FiUsers } from 'react-icons/fi'
import CustomerStack from './CustomerStack'

/**
 * Smart Alerts — realistic OS-style notification stack.
 *
 * Each notification has: the Opulit app icon (charcoal + lime, matching
 * the product's own brand mark) with a small colored severity badge
 * overlapping its corner, an app-name + timestamp row, a bold title, a
 * message, and a thin auto-dismiss progress bar that drains while the
 * notification is visible — exactly like a real push notification, not
 * a generic list row.
 *
 * Entrance is a soft spring pop (slight overshoot + a brief blur-in for
 * a "materializing" feel); exit is a right-swipe dismiss with a touch of
 * rotation. Self-contained — styles are in the embedded <style> tag.
 * Drop in as <SmartAlerts />.
 */

const ALERTS = [
  {
    id: "low-stock",
    tone: "warning",
    title: "Low Stock Alert",
    message: "Keyboard has only 8 units left",
    time: "now",
    icon: () => <path d="M12 3 2 20h20L12 3Z M12 9v5 M12 17h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    icon: () => <path d="M12 3 2 20h20L12 3Z M12 9v5 M12 17h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  },
  {
    id: "reorder",
    tone: "info",
    title: "Reorder Reminder",
    message: "Wireless Mouse — time to restock",
    time: "2m",
    icon: () => <path d="M3 12a9 9 0 0 1 15-6.7L21 8 M21 12a9 9 0 0 1-15 6.7L3 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    icon: () => <path d="M3 12a9 9 0 0 1 15-6.7L21 8 M21 12a9 9 0 0 1-15 6.7L3 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  },
  {
    id: "restocked",
    tone: "success",
    title: "Stock Updated",
    message: "Laptop Stand restocked to 42 units",
    time: "5m",
    icon: () => <path d="M4 12.5 9.5 18 20 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    icon: () => <path d="M4 12.5 9.5 18 20 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  },
  {
    id: "out-of-stock",
    tone: "critical",
    title: "Out of Stock",
    message: "USB Hub is out of stock",
    time: "12m",
    icon: () => <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    icon: () => <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  },
];

const HOLD_SECONDS = 3.4;

function SmartAlerts() {
  const wrapRef = useRef(null);
  const itemRefs = useRef([]);
  const barRefs = useRef([]);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;

    let tl;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const items = itemRefs.current;
        const bars = barRefs.current;

        gsap.set(items, { opacity: 0, x: 34, scale: 0.94, filter: "blur(4px)" });
        gsap.set(bars, { scaleX: 1 });

        tl = gsap.timeline({ repeat: -1, repeatDelay: 0.7 });

        items.forEach((el, i) => {
          const start = i === 0 ? 0 : "+=0.38";
          tl.to(el, { opacity: 1, x: 0, scale: 1, filter: "blur(0px)", duration: 0.55, ease: "back.out(1.6)" }, start);
          tl.fromTo(bars[i], { scaleX: 1 }, { scaleX: 0, duration: HOLD_SECONDS, ease: "none" }, "<");
        });

        tl.to(items, { opacity: 0, x: 60, rotate: 2, duration: 0.4, stagger: 0.07, ease: "power1.in" }, "+=1.1");
      },
      { threshold: 0.35 }
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      if (tl) tl.kill();
    };
  }, []);

  return (
    <div className="sa-wrap" ref={wrapRef}>
      <style>{`
        .sa-wrap {
          width: 400px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
        }
        .sa-panel {
          background: linear-gradient(180deg, #f6f3ec, #efece3);
          border-radius: 28px;
          padding: 8px 16px 75px;
          height: 387px;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          gap: 8px;
        }
        .sa-toast {
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: rgba(255,255,255,0.86);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,0.6);
          border-radius: 12px;
          padding: 8px 12px 14px;
          box-shadow: 0 14px 30px rgba(0,0,0,0.11), 0 2px 6px rgba(0,0,0,0.04);
          overflow: hidden;
          box-sizing: border-box;
        }
        .sa-app-icon {
          position: relative;
          flex-shrink: 0;
          width: 26px;
          height: 26px;
          border-radius: 8px;
          background: linear-gradient(155deg, #26262a, #101012);
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), 0 3px 6px rgba(0,0,0,0.18);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sa-app-icon svg { width: 12px; height: 12px; }
        .sa-badge {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid #f6f3ec;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sa-badge svg { width: 6px; height: 6px; }
        .tone-warning .sa-badge { background: #d9962a; color: #fff; }
        .tone-info .sa-badge { background: #4854c9; color: #fff; }
        .tone-success .sa-badge { background: #3f7d5a; color: #fff; }
        .tone-critical .sa-badge { background: #c23d3d; color: #fff; }

        .sa-body { flex: 1; min-width: 0; padding-top: 0; }
        .sa-meta {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 9px;
          color: #a3a39c;
          line-height: 1.2;
          margin-bottom: 2px;
        }
        .sa-app-name { font-weight: 600; color: #86867e; }
        .sa-title {
          font-size: 11px; font-weight: 700; color: #17171a;
          line-height: 1.2; margin-bottom: 1px; letter-spacing: -0.005em;
        }
        .sa-message {
          font-size: 10px; color: #62625c; line-height: 1.3;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin-bottom: 1px;
        }

        .sa-timer-track {
          position: absolute;
          left: 0; right: 0; bottom: 0;
          height: 2px;
          background: rgba(0,0,0,0.05);
        }
        .sa-timer-bar {
          height: 100%;
          width: 100%;
          transform-origin: left;
        }
        .tone-warning .sa-timer-bar { background: #d9962a; }
        .tone-info .sa-timer-bar { background: #4854c9; }
        .tone-success .sa-timer-bar { background: #3f7d5a; }
        .tone-critical .sa-timer-bar { background: #c23d3d; }
      `}</style>

      <div className="sa-panel">
        {ALERTS.map((alert, i) => (
          <div
            key={alert.id}
            ref={(el) => (itemRefs.current[i] = el)}
            className={`sa-toast tone-${alert.tone}`}
          >
            <span className="sa-app-icon">
              <img src="/opulit-favicon.png" alt="Opulit" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              <span className="sa-badge">
                <svg viewBox="0 0 24 24" fill="none">{alert.icon()}</svg>
                <svg viewBox="0 0 24 24" fill="none">{alert.icon()}</svg>
              </span>
            </span>

            <div className="sa-body">
              <div className="sa-meta">
                <span className="sa-app-name">Opulit</span>
                <span>·</span>
                <span>{alert.time}</span>
              </div>
              <div className="sa-title">{alert.title}</div>
              <div className="sa-message">{alert.message}</div>
            </div>

            <div className="sa-timer-track">
              <div className="sa-timer-bar" ref={(el) => (barRefs.current[i] = el)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

gsap.registerPlugin(ScrollTrigger)

const LIME = "#c7e05a";
const LIME_DARK = "#7ba82e";
const AMBER = "#f5a623";
const AMBER_DARK = "#b9860f";

function MouseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="7" y="2.5" width="10" height="19" rx="5" />
      <line x1="12" y1="2.5" x2="12" y2="10" />
    </svg>
  );
}
function KeyboardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2.5" y="5.5" width="19" height="13" rx="2.2" />
      <line x1="6" y1="9.5" x2="6.01" y2="9.5" />
      <line x1="10" y1="9.5" x2="10.01" y2="9.5" />
      <line x1="14" y1="9.5" x2="14.01" y2="9.5" />
      <line x1="18" y1="9.5" x2="18.01" y2="9.5" />
      <line x1="6" y1="14" x2="18" y2="14" />
    </svg>
  );
}
function StandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 16h16" />
      <path d="M7 16 10.5 6h3L17 16" />
      <path d="M9.5 20h5" />
    </svg>
  );
}

const PRODUCTS = [
  { id: "mouse", name: "Wireless Mouse", stock: 24, capacity: 60, low: false, Icon: MouseIcon },
  { id: "keyboard", name: "Keyboard", stock: 8, capacity: 60, low: true, Icon: KeyboardIcon },
  { id: "stand", name: "Laptop Stand", stock: 42, capacity: 60, low: false, Icon: StandIcon },
];

/**
 * Staff image marquee — continuous right-to-left scroll, premium framing.
 *
 * Pure CSS animation (no JS animation loop needed for a constant marquee —
 * more efficient than GSAP here and never drops frames). Images are
 * duplicated once so the loop is seamless; edges fade via a mask-image so
 * items don't appear to hard-cut in and out.
 *
 * IMPORTANT: the image URLs below are Lorem Picsum placeholders (a
 * royalty-free placeholder service) standing in for your real staff
 * photography — swap `src` for your own staff images before shipping.
 * Hover pauses the scroll, a nice touch for a live site.
 */

const STAFF_MEMBERS = [
  { id: "sarah", name: "Sarah Chen", src: "https://pub-3de7fea9a11f48308bacafaaf9387069.r2.dev/customer-card-1st-image.png" },
  { id: "mike", name: "Mike Johnson", src: "https://pub-3de7fea9a11f48308bacafaaf9387069.r2.dev/Customer-card-2-image.png" },
  { id: "emma", name: "Emma Davis", src: "https://pub-3de7fea9a11f48308bacafaaf9387069.r2.dev/Customer-card-3-image.png" },
  { id: "sarah", name: "Sarah Chen", src: "https://pub-3de7fea9a11f48308bacafaaf9387069.r2.dev/customer-card-1st-image.png" },
  { id: "mike", name: "Mike Johnson", src: "https://pub-3de7fea9a11f48308bacafaaf9387069.r2.dev/Customer-card-2-image.png" },
  { id: "emma", name: "Emma Davis", src: "https://pub-3de7fea9a11f48308bacafaaf9387069.r2.dev/Customer-card-3-image.png" },
];

function StaffMarquee() {
  // duplicate the set once so the track can loop seamlessly at -50%
  const track = [...STAFF_MEMBERS, ...STAFF_MEMBERS];

  return (
    <div className="sm-wrap">
      <style>{`
        .sm-wrap {
          width: 420px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
        }
        .sm-card {
          overflow: hidden;
        }
        .sm-viewport {
          overflow: hidden;
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
          mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
        }
        .sm-track {
          display: flex;
          gap: 16px;
          width: max-content;
          padding: 0 16px;
          animation: sm-scroll 16s linear infinite;
        }
        .sm-wrap:hover .sm-track {
          animation-play-state: paused;
        }
        .sm-item {
          position: relative;
          flex-shrink: 0;
          width: 260px;
          height: 200px;
          border-radius: 20px;
          overflow: hidden;
        }
        .sm-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .sm-item-label {
          position: absolute;
          left: 0; right: 0; bottom: 0;
          padding: 10px 12px;
          font-size: 12px;
          font-weight: 600;
          color: #fff;
          background: linear-gradient(0deg, rgba(0,0,0,0.55), transparent);
        }
        @keyframes sm-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>

      <div className="sm-card">
        <div className="sm-viewport">
          <div className="sm-track">
            {track.map((member, i) => (
              <div className="sm-item" key={`${member.id}-${i}`}>
                <img src={member.src} alt={member.name} loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WhatsAppBilling() {
  const [showTyping, setShowTyping] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showRead, setShowRead] = useState(false);
  const [showReply, setShowReply] = useState(false);

  const timeoutsRef = useRef([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    function resetState() {
      setShowTyping(false);
      setShowInvoice(false);
      setShowRead(false);
      setShowReply(false);
    }

    function clearTimeouts() {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    }

    function playSequence() {
      clearTimeouts();
      resetState();

      timeoutsRef.current.push(
        setTimeout(() => setShowTyping(true), 300),
        setTimeout(() => setShowInvoice(true), 1400),
        setTimeout(() => setShowRead(true), 2900),
        setTimeout(() => setShowReply(true), 3800)
      );
    }

    playSequence();
    intervalRef.current = setInterval(playSequence, 7000);

    return () => {
      clearTimeouts();
      clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div style={styles.page}>
      <style>{css}</style>

      <div className="wa-card">
        <div className="wa-top">
          <div className="wa-avatar">📦</div>
          <div className="wa-top-info">
            <div className="name">Opulit Store</div>
            <div className="status">online</div>
          </div>
          <div className="wa-top-icons">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92z" />
            </svg>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="12" cy="19" r="1.6" />
            </svg>
          </div>
        </div>

        <div className="wa-body">
          <div className="date-chip">TODAY</div>

          <div className={`typing-bubble${showTyping ? " show" : ""}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>

          <div className={`invoice-card${showInvoice ? " show" : ""}`}>
            <div className="invoice-head">📋 Invoice #1042</div>
            <div className="invoice-row">
              <span>Wireless Mouse × 2</span>
              <span>₹2,400</span>
            </div>
            <div className="invoice-divider"></div>
            <div className="invoice-total">
              <span>Total</span>
              <span>₹2,400</span>
            </div>
            <div className="invoice-meta">
              10:41 AM
              <span className={`ticks${showRead ? " read" : ""}`}>
                <svg viewBox="0 0 16 11">
                  <path d="M1 5.5 4.5 9 11 1" />
                  <path d="M6 5.5 9.5 9 16 1" />
                </svg>
              </span>
            </div>
            <div className="pay-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
              </svg>
              Pay Now
            </div>
          </div>

          <div className={`reply-bubble${showReply ? " show" : ""}`}>
            Got it, paying now 👍
            <span className="time">10:42 AM</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    marginTop: "-150px",
  },
};

const css = `
  .wa-card{
    --wall:#EAE6DF;
    --header-bg:#FFFFFF;
    --text-dark:#111B21;
    --green-online:#25D366;
    --icon-grey:#54656F;
    --bubble-green:#D9FDD3;
    --bubble-white:#FFFFFF;
    --tick-grey:#8696A0;
    --tick-blue:#53BDEB;
    --link-blue:#2A8CFF;
    --amount-dark:#0B1F17;

    width:100%;
    max-width:320px;
    height:280px;
    background:var(--wall);
    border-radius:14px;
    overflow:hidden;
    box-shadow:0 16px 40px -16px rgba(0,0,0,0.5);
    display:flex;
    flex-direction:column;
    position:relative;
    background-image: radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px);
    background-size:14px 14px;
  }

  .wa-card *{ box-sizing:border-box; }

  /* ---- header ---- */
  .wa-top{
    background:var(--header-bg);
    display:flex;
    align-items:center;
    gap:8px;
    padding:9px 11px;
    flex-shrink:0;
    box-shadow:0 1px 0 rgba(0,0,0,0.06);
  }
  .wa-avatar{
    width:28px; height:28px;
    border-radius:50%;
    background:#111417;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:13px;
    flex-shrink:0;
  }
  .wa-top-info{ flex:1; line-height:1.2; min-width:0; }
  .wa-top-info .name{ font-size:12.5px; font-weight:700; color:var(--text-dark); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .wa-top-info .status{ font-size:10.5px; color:var(--green-online); font-weight:500; }
  .wa-top-icons{ display:flex; align-items:center; gap:11px; color:var(--icon-grey); }
  .wa-top-icons svg{ width:15px; height:15px; }

  /* ---- body ---- */
  .wa-body{
    flex:1;
    padding:10px 11px;
    display:flex;
    flex-direction:column;
    gap:7px;
    overflow:hidden;
  }

  .date-chip{
    align-self:center;
    background:#FFFFFF;
    color:#5c6a70;
    font-size:9.5px;
    font-weight:600;
    letter-spacing:0.02em;
    padding:3px 9px;
    border-radius:7px;
    box-shadow:0 1px 1px rgba(0,0,0,0.06);
    margin-bottom:2px;
  }

  /* ---- invoice card ---- */
  .invoice-card{
    align-self:flex-end;
    width:80%;
    background:var(--bubble-green);
    border-radius:9px;
    border-top-right-radius:2px;
    padding:9px 10px 7px;
    box-shadow:0 1px 1px rgba(0,0,0,0.08);
    opacity:0;
    transform:translateY(16px) scale(0.97);
  }
  .invoice-card.show{
    animation:invoiceIn 0.55s cubic-bezier(.2,.8,.25,1) forwards;
  }
  @keyframes invoiceIn{
    to{ opacity:1; transform:translateY(0) scale(1); }
  }

  .invoice-head{
    display:flex;
    align-items:center;
    gap:5px;
    font-size:11.5px;
    font-weight:700;
    color:var(--amount-dark);
    margin-bottom:6px;
  }

  .invoice-row{
    display:flex;
    justify-content:space-between;
    font-size:10.5px;
    color:#2b3a33;
    margin-bottom:4px;
  }

  .invoice-divider{
    height:1px;
    background:rgba(0,0,0,0.08);
    margin:4px 0 6px;
  }

  .invoice-total{
    display:flex;
    justify-content:space-between;
    font-size:11.5px;
    font-weight:700;
    color:var(--amount-dark);
    margin-bottom:6px;
  }

  .invoice-meta{
    display:flex;
    justify-content:flex-end;
    align-items:center;
    gap:4px;
    font-size:9px;
    color:#5c6a63;
    margin-bottom:4px;
  }
  .ticks svg{ width:12px; height:9px; display:block; }
  .ticks path{ fill:none; stroke:var(--tick-grey); stroke-width:1.6; stroke-linecap:round; stroke-linejoin:round; transition:stroke 0.4s ease; }
  .ticks.read path{ stroke:var(--tick-blue); }

  .pay-row{
    border-top:1px solid rgba(0,0,0,0.08);
    padding-top:6px;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:5px;
    font-size:10.5px;
    font-weight:700;
    color:var(--link-blue);
  }
  .pay-row svg{ width:12px; height:12px; }

  /* ---- typing indicator ---- */
  .typing-bubble{
    align-self:flex-end;
    background:var(--bubble-green);
    border-top-right-radius:2px;
    border-radius:8px;
    padding:7px 10px;
    display:flex;
    gap:3px;
    width:fit-content;
    opacity:0;
    transform:translateY(6px);
    box-shadow:0 1px 1px rgba(0,0,0,0.08);
  }
  .typing-bubble span{
    width:4px; height:4px;
    border-radius:50%;
    background:#5f7a67;
    animation:typingDot 1s infinite ease-in-out;
  }
  .typing-bubble span:nth-child(2){ animation-delay:0.15s; }
  .typing-bubble span:nth-child(3){ animation-delay:0.3s; }
  @keyframes typingDot{
    0%,60%,100%{ transform:translateY(0); opacity:0.5; }
    30%{ transform:translateY(-3px); opacity:1; }
  }
  .typing-bubble.show{
    animation:fadeInUp 0.3s ease forwards, fadeOut 0.3s ease 1s forwards;
  }
  @keyframes fadeInUp{ to{ opacity:1; transform:translateY(0); } }
  @keyframes fadeOut{ to{ opacity:0; transform:translateY(-4px); } }

  /* ---- reply bubble ---- */
  .reply-bubble{
    align-self:flex-start;
    max-width:70%;
    background:var(--bubble-white);
    border-radius:8px;
    border-top-left-radius:2px;
    padding:6px 9px 5px;
    font-size:10.5px;
    color:var(--text-dark);
    box-shadow:0 1px 1px rgba(0,0,0,0.08);
    opacity:0;
    transform:translateY(10px);
  }
  .reply-bubble .time{
    display:block;
    margin-top:2px;
    font-size:9px;
    color:#8a959a;
  }
  .reply-bubble.show{
    animation:invoiceIn 0.45s cubic-bezier(.2,.8,.25,1) forwards;
  }

  @media (prefers-reduced-motion: reduce){
    .typing-bubble, .invoice-card, .reply-bubble{ animation:none !important; opacity:1 !important; transform:none !important; }
  }
`;


function ProductIcon({ Icon, low }) {
  return (
    <div
      style={{
        width: 26,
        height: 26,
        flexShrink: 0,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: low 
          ? "linear-gradient(135deg, rgba(230, 126, 34, 0.15), rgba(230, 126, 34, 0.05))" 
          : "linear-gradient(135deg, rgba(0,0,0,0.06), rgba(0,0,0,0.02))",
        border: `1px solid ${low ? "rgba(230, 126, 34, 0.3)" : "rgba(0,0,0,0.1)"}`,
        color: low ? "#e67e22" : "rgba(0,0,0,0.7)",
        boxShadow: low ? "0 2px 6px rgba(230, 126, 34, 0.15)" : "0 2px 6px rgba(0,0,0,0.08)",
      }}
    >
      <Icon />
    </div>
  );
}

function StockRow({ product, active, index }) {
  const [stock, setStock] = useState(product.stock);
  const { capacity, low, Icon, name } = product;
  const pct = Math.min(100, Math.round((stock / capacity) * 100));

  useEffect(() => {
    if (!active) return;
    const min = low ? 4 : Math.round(capacity * 0.25);
    const max = low ? 11 : Math.round(capacity * 0.8);

    const tick = () => {
      setStock((s) => {
        const step = Math.random() > 0.5 ? 1 : -1;
        const next = s + step;
        if (next < min) return s + 1;
        if (next > max) return s - 1;
        return next;
      });
    };

    const delay = 2600 + index * 700;
    const start = setTimeout(() => {
      tick();
      const interval = setInterval(tick, 3400);
      start.interval = interval;
    }, delay);

    return () => {
      clearTimeout(start);
      if (start.interval) clearInterval(start.interval);
    };
  }, [active, index, low, capacity]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <ProductIcon Icon={Icon} low={low} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(0,0,0,0.8)",
            }}
          >
            {name}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {low && (
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #e67e22, #d35400)",
                  display: "inline-block",
                  boxShadow: "0 1px 3px rgba(230, 126, 34, 0.3)",
                }}
              />
            )}
            <AnimatePresence mode="popLayout">
              <motion.span
                key={stock}
                initial={{ opacity: 0, y: -3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 3 }}
                transition={{ duration: 0.3 }}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#1a1a1a",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {stock}
              </motion.span>
            </AnimatePresence>
            <span style={{ fontSize: 10, color: "rgba(0,0,0,0.5)", fontWeight: 500 }}>
              left
            </span>
          </span>
        </div>

        <div
          style={{
            position: "relative",
            height: 4,
            width: "100%",
            overflow: "hidden",
            borderRadius: 999,
            background: "rgba(0,0,0,0.08)",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          <motion.div
            style={{
              height: "100%",
              borderRadius: 999,
              background: low
                ? `linear-gradient(90deg, #d35400, #e67e22)` 
                : `linear-gradient(90deg, #7ba82e, #c7e05a)`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
            initial={{ width: 0 }}
            animate={{ width: active ? `${pct}%` : 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>
    </div>
  );
}

function InventoryDashboardPanel() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 18,
        border: "1px solid rgba(0,0,0,0.1)",
        background: "linear-gradient(145deg, #ffffff 0%, #f5f7fa 100%)",
        padding: 20,
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)",
        width: "min(100%, 272px)",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif",
      }}
    >
      {/* top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            borderRadius: 999,
            border: `1px solid rgba(199, 224, 90, 0.4)`,
            background: "linear-gradient(135deg, rgba(199, 224, 90, 0.15), rgba(199, 224, 90, 0.05))",
            padding: "3px 10px",
            fontSize: 10,
            fontWeight: 600,
            color: "#5a7a1a",
            boxShadow: "0 2px 4px rgba(199, 224, 90, 0.1)",
          }}
        >
          <motion.span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #c7e05a, #7ba82e)",
              display: "inline-block",
            }}
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
          LIVE
        </span>
        <span
          style={{
            borderRadius: 999,
            background: "linear-gradient(135deg, rgba(0,0,0,0.06), rgba(0,0,0,0.02))",
            padding: "3px 12px",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.03em",
            color: "rgba(0,0,0,0.7)",
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          STOCK
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>
          126 units
        </span>
      </div>

      {/* stat tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 6,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.08)",
            background: "linear-gradient(135deg, #ffffff, #f8f9fa)",
            padding: "8px 10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 8,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "rgba(0,0,0,0.5)",
            }}
          >
            Total SKUs
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>
            126
          </p>
        </div>
        <div
          style={{
            borderRadius: 10,
            border: "1px solid rgba(230, 126, 34, 0.2)",
            background: "linear-gradient(135deg, #fff8f0, #fff)",
            padding: "8px 10px",
            boxShadow: "0 2px 8px rgba(230, 126, 34, 0.08)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 8,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "rgba(230, 126, 34, 0.7)",
            }}
          >
            Low stock
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 15, fontWeight: 700, color: "#e67e22" }}>
            1 item
          </p>
        </div>
      </div>

      {/* product stock list */}
      <div
        style={{
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.08)",
          background: "linear-gradient(135deg, #ffffff, #fafbfc)",
          padding: 10,
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PRODUCTS.map((p, i) => (
            <StockRow key={p.id} product={p} active={inView} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}


export default function Features() {
    const heroRef = useRef(null)
    const featuresRef = useRef(null)
    const [activeSlide, setActiveSlide] = useState(0)
    const animationRefs = useRef({})

    const heroSlides = [
        { image: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1100&q=85', alt: 'Business owner reviewing work at a desk', metric: '98%', label: 'Customer satisfaction', brand: 'Customer care', detail: 'Every customer detail, ready when you need it.' },
        { image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1100&q=85', alt: 'Team collaborating around a table', metric: '3×', label: 'Faster daily operations', brand: 'Team workflow', detail: 'Keep your team moving from one shared workspace.' },
        { image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1100&q=85', alt: 'Business team planning together', metric: '24/7', label: 'Business visibility', brand: 'Opulit insights', detail: 'A clearer view of the work that matters most.' }
    ]

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

    useEffect(() => {
        const hero = heroRef.current
        const section = featuresRef.current
        if (!hero || !section) return

        const ctx = gsap.context(() => {
            gsap.from(hero.querySelectorAll('.hero-copy > *'), {
                y: 28,
                opacity: 0,
                duration: 0.85,
                stagger: 0.1,
                ease: 'power3.out'
            })

            gsap.fromTo(section.querySelectorAll('.feature-card'),
                { y: 45, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.75,
                    stagger: 0.1,
                    ease: 'power3.out',
                    scrollTrigger: { trigger: section.querySelector('.features-grid'), start: 'top 82%' }
                }
            )
        }, section)

        return () => ctx.revert()
    }, [])

    useEffect(() => {
        const rotation = window.setInterval(() => setActiveSlide(current => (current + 1) % heroSlides.length), 3800)
        return () => window.clearInterval(rotation)
    }, [heroSlides.length])

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Analytics Animation
            const chartBars = animationRefs.current['chart-bars']
            if (chartBars) {
                gsap.to(chartBars.children, {
                    scaleY: 0.7,
                    duration: 0.75,
                    repeat: -1,
                    yoyo: true,
                    ease: 'power1.inOut',
                    stagger: 0.1,
                    transformOrigin: 'bottom'
                })
            }
        }, featuresRef)

        return () => ctx.revert()
    }, [])

    const features = [
        { icon: FiBox, title: 'Inventory Management', description: 'Keep every product, location, and reorder point perfectly in sync.', type: 'inventory' },
        { icon: FiUsers, title: 'Customer Management', description: 'Turn every purchase into a stronger customer relationship.', type: 'customers' },
        { icon: FiMessageCircle, title: 'WhatsApp Billing', description: 'Share bills where customers already are and get paid faster.', type: 'whatsapp' },
        { icon: FiMessageCircle, title: 'WhatsApp Billing', description: 'Share bills where customers already are and get paid faster.', type: 'whatsapp' },
        { icon: FiBarChart2, title: 'Advanced Analytics', description: 'See the signals behind your sales, stock, and customer behaviour.', type: 'analytics' },
        { icon: FiBell, title: 'Smart Alerts', description: 'Get a useful nudge before stock, payments, or tasks need attention.', type: 'alerts' },
        { icon: FiShield, title: 'Staff Management', description: 'Give every teammate the right access with confidence and clarity.', type: 'staff' }
    ]

    return (
        <main className="features-page" ref={featuresRef}>
            <section className="features-hero" ref={heroRef}>
                <div className="hero-copy">
                <span className="hero-eyebrow"><p></p> Built for growing businesses</span>
                <h1>Made for the work that <em>matters most.</em></h1>
                <p>Powerful, connected tools for inventory, customers, billing, and your team—designed to make every day feel more under control.</p>
                <div className="hero-actions">
                    <a href="/signup">Start free trial <span>→</span></a>
                    <a className="hero-text-link" href="#feature-detail">Explore the platform</a>
                </div>
                <div className="hero-proof" aria-label="Product highlights">
                    <span><b>01</b> One connected workspace</span>
                    <span><b>02</b> Built for teams in motion</span>
                    <span><b>03</b> Clearer decisions, daily</span>
                </div>
                </div>
                <div className="hero-carousel" aria-roledescription="carousel" aria-label="Opulit customer outcomes">
                    <div className="carousel-stage">
                        {heroSlides.map((slide, index) => {
                            const distance = (index - activeSlide + heroSlides.length) % heroSlides.length
                            const position = distance === 0 ? 'active' : distance === 1 ? 'right' : 'left'
                            const isActive = index === activeSlide
                            return (
                                <article className={`hero-slide hero-slide-${position}`} key={slide.brand} aria-hidden={!isActive}>
                                    <img src={slide.image} alt={slide.alt} />
                                    <div className="slide-shade"></div>
                                    <div className="slide-stat"><span>{slide.label}</span><strong>{slide.metric}</strong></div>
                                    <div className="slide-overlay"><span className="slide-brand-mark"><img src="/favicon-32.png" alt="Opulit logo" /></span><div><strong>{slide.brand}</strong><p>{slide.detail}</p></div></div>
                                </article>
                            )
                        })}
                    </div>
                    <div className="carousel-pagination" role="tablist" aria-label="Choose a customer outcome">
                        {heroSlides.map((slide, index) => <button type="button" key={slide.brand} className={activeSlide === index ? 'is-active' : ''} role="tab" aria-selected={activeSlide === index} aria-label={`Show ${slide.brand}`} onClick={() => setActiveSlide(index)}><span></span></button>)}
                    </div>
                </div>
            </section>

            <section className="features-grid" aria-label="Opulit features">
                {features.map((feature, index) => (
                    <article className={`feature-card feature-card-${index + 1} ${feature.type === 'analytics' ? 'analytics-card' : ''} ${feature.type === 'inventory' ? 'inventory-card' : ''} ${feature.type === 'customers' ? 'customers-card' : ''} ${feature.type === 'alerts' ? 'alerts-card' : ''} ${feature.type === 'staff' ? 'staff-card' : ''}`} key={feature.title}>
                        {feature.type === 'staff' && <style>{`
                            .staff-card {
                                position: relative;
                            }
                            .staff-animation {
                                position: absolute;
                                top: 200px;
                                left: 50%;
                                transform: translateX(-50%);
                            }
                        `}</style>}
                        <span className="feature-number">0{index + 1}</span>
                        <h3>{feature.title}</h3>
                        <p>{feature.description}</p>
                        {feature.type === 'analytics' && (
                            <div className="card-animation analytics-animation">
                                <div className="analytics-dashboard" aria-label="Analytics dashboard preview">
                                    <div className="dashboard-topbar">
                                        <span className="mini-pill live">Live</span>
                                        <span className="mini-pill">Sales</span>
                                        <span className="dashboard-value">₹1.8M</span>
                                    </div>
                                    <div className="dashboard-grid">
                                        <div className="dashboard-metric">
                                            <small>Conversion</small>
                                            <strong>4.8%</strong>
                                        </div>
                                        <div className="dashboard-metric">
                                            <small>Orders</small>
                                            <strong>2.4k</strong>
                                        </div>
                                    </div>
                                    <div className="dashboard-chart">
                                        <div className="chart-area">
                                            <span className="chart-line"></span>
                                        </div>
                                        <div className="chart-bars" ref={el => animationRefs.current['chart-bars'] = el}>
                                            <div className="chart-bar" style={{ height: '40%' }}></div>
                                            <div className="chart-bar" style={{ height: '62%' }}></div>
                                            <div className="chart-bar" style={{ height: '48%' }}></div>
                                            <div className="chart-bar" style={{ height: '86%' }}></div>
                                            <div className="chart-bar" style={{ height: '72%' }}></div>
                                            <div className="chart-bar" style={{ height: '94%' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {feature.type === 'inventory' && (
                            <div className="card-animation inventory-animation">
                                <InventoryDashboardPanel />
                            </div>
                        )}
                        {feature.type === 'customers' && (
                            <div className="card-animation customer-animation">
                                <CustomerStack />
                            </div>
                        )}
                        {feature.type === 'whatsapp' && (
                            <div className="card-animation whatsapp-animation">
                                <WhatsAppBilling />
                            </div>
                        )}
                        {feature.type === 'whatsapp' && (
                            <div className="card-animation whatsapp-animation">
                                <WhatsAppBilling />
                            </div>
                        )}
                        {feature.type === 'alerts' && (
                            <div className="card-animation alerts-animation">
                                <SmartAlerts />
                            </div>
                        )}
                        {feature.type === 'staff' && (
                            <div className="card-animation staff-animation">
                                <StaffMarquee />
                            </div>
                        )}
                    </article>
                ))}
            </section>

            <section className="feature-detail" id="feature-detail">
                <div className="detail-content">
                    <div className="detail-text">
                        <span className="detail-label">Why Opulit</span>
                        <h2>Built for growing businesses</h2>
                        <p>Opulit brings together everything you need to run your business efficiently—without switching between tools or losing sight of what matters.</p>
                        <ul className="detail-list">
                            <li><span>✓</span> All-in-one platform</li>
                            <li><span>✓</span> Real-time synchronization</li>
                            <li><span>✓</span> Mobile-friendly design</li>
                            <li><span>✓</span> Secure and reliable</li>
                        </ul>
                        <a className="detail-cta" href="/signup">Get started <span>→</span></a>
                    </div>
                    <div className="detail-visual" aria-label="Opulit dashboard preview">
                        <div className="visual-glow"></div>
                        <div className="visual-card">
                            <div className="visual-header">
                                <span><i></i> Overview</span>
                                <div className="visual-dots"><span></span><span></span><span></span></div>
                            </div>
                            <div className="visual-body">
                                <div className="visual-stat visual-stat-featured">
                                    <small>Total sales</small>
                                    <strong>₹124,580</strong>
                                    <em>↑ 23% this month</em>
                                    <div className="sparkline"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
                                </div>
                                <div className="visual-stats-row">
                                    <div className="visual-stat"><small>Active customers</small><strong>1,248</strong><em>↑ 12% this month</em></div>
                                    <div className="visual-stat"><small>Low-stock items</small><strong>08</strong><em className="attention">Needs attention</em></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="features-cta">
                <div className="cta-content">
                    <span className="cta-kicker">Start simplifying</span>
                    <h2>Ready to transform your business?</h2>
                    <p>Join thousands of businesses using Opulit to streamline operations and build momentum.</p>
                    <div className="cta-buttons">
                        <a className="cta-primary" href="/signup">Start free trial <span>→</span></a>
                        <a className="cta-secondary" href="/contact">Talk to sales</a>
                    </div>
                </div>
            </section>

            <footer className="features-footer">
                <div className="footer-main">
                    <div className="footer-brand">
                        <a className="footer-logo" href="/">Opulit</a>
                        <p>The everyday operating system for businesses that want to grow without the chaos.</p>
                        <a className="footer-contact" href="/contact">Talk to our team →</a>
                    </div>
                    <div className="footer-links">
                        <div><h3>Product</h3><a href="/pricing">Pricing</a><a href="/features">Features</a><a href="/signup">Create account</a></div>
                        <div><h3>Company</h3><a href="/about">About Opulit</a><a href="/contact">Contact</a><a href="/login">Sign in</a></div>
                        <div><h3>Built for</h3><span>Retail teams</span><span>Service businesses</span><span>Growing operators</span></div>
                    </div>
                </div>
                <div className="footer-bottom"><span>© {new Date().getFullYear()} Opulit. Built for growing businesses.</span><div><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div></div>
            </footer>
        </main>
    )
}
