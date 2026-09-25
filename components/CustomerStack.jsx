import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

/**
 * Customer stack — 3 cards deep, GSAP-driven.
 *
 * Card 1 (front) is fully visible. Cards 2 and 3 sit behind it, each
 * progressively smaller / dimmer / further back, so the stack reads as
 * real depth even at rest. Every ~4s the front card slides down and
 * fades out, card 2 glides forward into the front slot, card 3 glides
 * into the middle slot, and the card that just left quietly rejoins at
 * the back (invisible during the swap, then fades into its dim resting
 * state) — a continuous loop, no dead frame, no hard cuts.
 *
 * Drop this in as <CustomerStack /> anywhere. Self-contained: styles are
 * scoped under .cs- class names via the embedded <style> tag below.
 */

const CUSTOMERS = [
  {
    id: "1204", name: "Arjun Mehta", score: 94, avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    firstProduct: "Wireless Mouse", firstDate: "Sep 2024 · Online", firstValue: "₹1,200",
    lastProduct: "Laptop Stand", lastDate: "Jul 2026 · Repeat", lastValue: "₹3,800",
    orders: "12", avgGap: "18 days", totalSpend: "₹42,000",
  },
  {
    id: "1187", name: "Priya Sharma", score: 88, avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    firstProduct: "Keyboard", firstDate: "Jan 2025 · Online", firstValue: "₹950",
    lastProduct: "Wireless Mouse", lastDate: "Jul 2026 · Repeat", lastValue: "₹1,450",
    orders: "8", avgGap: "22 days", totalSpend: "₹28,000",
  },
  {
    id: "1092", name: "Aman Gupta", score: 81, avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    firstProduct: "Laptop Stand", firstDate: "Apr 2025 · Online", firstValue: "₹1,800",
    lastProduct: "Keyboard", lastDate: "Jun 2026 · Repeat", lastValue: "₹1,100",
    orders: "5", avgGap: "31 days", totalSpend: "₹19,000",
  },
];

// resting transform for each depth slot: 0 = front, 1 = mid, 2 = back
const SLOTS = [
  { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, zIndex: 3 },
  { x: 0, y: -12, rotation: -2, scale: 0.96, opacity: 0.82, zIndex: 2 },
  { x: 0, y: -24, rotation: -4, scale: 0.92, opacity: 0.5, zIndex: 1 },
];

function CardContent({ c }) {
  return (
    <>
      <div className="cs-header">
        <div className="cs-title">
          <div className="cs-avatar">
            <img src={c.avatar} alt={c.name} />
          </div>
          <div>
            <span className="cs-muted">Customer #{c.id} — </span>
            <span className="cs-name">{c.name}</span>
          </div>
        </div>
        <div className="cs-score">
          <span className="cs-dot" />
          Score: {c.score}
        </div>
      </div>

      <div className="cs-compare">
        <div className="cs-col">
          <div className="cs-label">First order</div>
          <div className="cs-product">{c.firstProduct}</div>
          <div className="cs-sub">{c.firstDate}</div>
          <div className="cs-value">{c.firstValue}</div>
        </div>

        <svg className="cs-arrow" width="18" height="14" viewBox="0 0 18 14" fill="none">
          <path d="M1 7h15M11 1l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <div className="cs-col">
          <div className="cs-label">Latest order</div>
          <div className="cs-product">{c.lastProduct}</div>
          <div className="cs-sub">{c.lastDate}</div>
          <div className="cs-value cs-green">{c.lastValue}</div>
        </div>
      </div>

      <div className="cs-footer">
        <div className="cs-footer-stats">
          <div>
            <div className="cs-footer-label">Orders</div>
            <div className="cs-footer-value">{c.orders}</div>
          </div>
          <div>
            <div className="cs-footer-label">Avg. gap</div>
            <div className="cs-footer-value">{c.avgGap}</div>
          </div>
        </div>
        <div className="cs-footer-total">
          <div className="cs-footer-label">Total spend</div>
          <div className="cs-total-value">{c.totalSpend}</div>
        </div>
      </div>
    </>
  );
}

export default function CustomerStack() {
  const wrapRef = useRef(null);
  const cardRefs = [useRef(null), useRef(null), useRef(null)];
  const roleOfRef = useRef([0, 1, 2]); // roleOfRef.current[i] = current slot of cardRefs[i]
  const frontPointer = useRef(0); // index into CUSTOMERS currently at the front

  const [cardCustomers, setCardCustomers] = useState([
    CUSTOMERS[0],
    CUSTOMERS[1],
    CUSTOMERS[2],
  ]);

  // place each card at its resting slot on mount
  useEffect(() => {
    cardRefs.forEach((ref, i) => {
      const slot = SLOTS[roleOfRef.current[i]];
      gsap.set(ref.current, {
        x: slot.x,
        y: slot.y,
        rotation: slot.rotation,
        scale: slot.scale,
        opacity: slot.opacity,
        zIndex: slot.zIndex,
        transformOrigin: "50% 50%",
      });
    });
  }, []);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const interval = setInterval(cycle, 4000);
        node.dataset.cleanup = "true";
        node._cleanup = () => clearInterval(interval);
      },
      { threshold: 0.35 }
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (node._cleanup) node._cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getRefIndexByRole(role) {
    return roleOfRef.current.indexOf(role);
  }

  function cycle() {
    const frontIdx = getRefIndexByRole(0);
    const midIdx = getRefIndexByRole(1);
    const backIdx = getRefIndexByRole(2);

    const frontEl = cardRefs[frontIdx].current;
    const midEl = cardRefs[midIdx].current;
    const backEl = cardRefs[backIdx].current;

    const tl = gsap.timeline({
      defaults: { ease: "power3.inOut" },
      onComplete: () => {
        roleOfRef.current = roleOfRef.current.map((r) => (r + 2) % 3);
        frontPointer.current = (frontPointer.current + 1) % CUSTOMERS.length;

        setCardCustomers((prev) => {
          const next = [...prev];
          next[frontIdx] = CUSTOMERS[(frontPointer.current + 2) % CUSTOMERS.length];
          return next;
        });
      },
    });

    // front card exits in the same motion window as the mid/back cards settle
    tl.to(frontEl, {
      x: 32,
      y: 72,
      rotation: 12,
      scale: 0.98,
      opacity: 0,
      zIndex: 4,
      duration: 0.7,
      ease: "power3.inOut",
    }, 0);
    tl.to(midEl, { ...SLOTS[0], duration: 0.8, ease: "power3.inOut" }, 0);
    tl.to(backEl, { ...SLOTS[1], duration: 0.8, ease: "power3.inOut" }, 0);

    // keep the outgoing card in sync with the incoming stack, then ease it back into the last slot
    tl.set(frontEl, {
      x: 0,
      y: SLOTS[2].y,
      rotation: SLOTS[2].rotation,
      scale: SLOTS[2].scale,
      opacity: 0,
      zIndex: SLOTS[2].zIndex,
    }, 0.68);
    tl.to(frontEl, { ...SLOTS[2], opacity: 0.45, duration: 0.52, ease: "power2.out" }, 0.72);
  }

  return (
    <div className="cs-wrap" ref={wrapRef}>
      <style>{`
        .cs-wrap {
          position: relative;
          width: 100%;
          height: 240px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
          display: flex;
          justify-content: center;
        }
        .cs-card {
          position: absolute;
          top: 30px;
          width: 280px;
          height: 200px;
          background: #ffffff;
          border: 1px solid rgba(0,0,0,0.07);
          border-radius: 20px;
          padding: 20px 22px;
          box-shadow: 0 28px 50px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.04);
          will-change: transform, opacity;
          transform-style: preserve-3d;
        }
          @media(max-width:900px){
          .cs-card{
          width:240px;
          }
          }
        .cs-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
        }
        .cs-title { font-size: 13px; color: #17171a; display: flex; align-items: center; gap: 10px; }
        .cs-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4a8a63, #3f7d5a);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          flex-shrink: 0;
          overflow: hidden;
        }
        .cs-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .cs-muted { color: #96968e; font-weight: 400; }
        .cs-name { font-weight: 700; letter-spacing: -0.01em; }
        .cs-score { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #96968e; }
        .cs-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #4a8a63; display: inline-block;
          animation: csPulse 2.4s ease-in-out infinite;
        }
        @keyframes csPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

        .cs-compare { display: flex; align-items: flex-start; gap: 16px; padding: 18px 0 14px; }
        .cs-col { flex: 1; min-width: 0; }
        .cs-label { font-size: 9px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: #ababa3; margin-bottom: 6px; }
        .cs-product { font-size: 13px; font-weight: 600; color: #17171a; margin-bottom: 2px; }
        .cs-sub { font-size: 11px; color: #9c9c96; margin-bottom: 10px; }
        .cs-value { font-size: 24px; font-weight: 700; color: #17171a; letter-spacing: -0.015em; }
        .cs-green { color: #3f7d5a; }
        .cs-arrow { flex-shrink: 0; color: #c2c2b9; margin-top: 30px; }

        .cs-footer { display: flex; align-items: flex-end; justify-content: space-between; }
        .cs-footer-stats { display: flex; gap: 24px; }
        .cs-footer-label { font-size: 9px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #ababa3; margin-bottom: 3px; }
        .cs-footer-value { font-size: 12px; font-weight: 600; color: #55554e; }
        .cs-footer-total { text-align: right; }
        .cs-total-value { font-size: 18px; font-weight: 700; color: #3f7d5a; letter-spacing: -0.01em; }
      `}</style>

      {cardRefs.map((ref, i) => (
        <div className="cs-card" ref={ref} key={i}>
          <CardContent c={cardCustomers[i]} />
        </div>
      ))}
    </div>
  );
}
