import { useEffect, useRef, useState } from "react";

const SearchIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.3-4.3"></path>
  </svg>
);

const UsersIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const UserCheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="m22 9-7 7-4-4"></path>
  </svg>
);

const UserPlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <line x1="19" x2="19" y1="8" y2="14"></line>
    <line x1="16" x2="22" y1="11" y2="11"></line>
  </svg>
);

const MoreVerticalIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1"></circle>
    <circle cx="12" cy="5" r="1"></circle>
    <circle cx="12" cy="19" r="1"></circle>
  </svg>
);

const ArrowUpIcon = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="m18 15-6-6-6 6"></path>
  </svg>
);

const STATS = [
  { key: "total", label: "Total customers", value: 1398, delta: "+12%", icon: UsersIcon, tint: "#f5a35c", tintBg: "rgba(245,163,92,0.12)" },
  { key: "active", label: "Active customers", value: 860, delta: "+8%", icon: UserCheckIcon, tint: "#34c98d", tintBg: "rgba(52,201,141,0.12)" },
  { key: "new", label: "New this month", value: 126, delta: "+15%", icon: UserPlusIcon, tint: "#8b6ee6", tintBg: "rgba(139,110,230,0.12)" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
const BAR_HEIGHTS = [34, 42, 50, 58, 68, 80, 94];
const BAR_COLORS = ["#f4735c", "#f5905a", "#f5ad5a", "#e3c25a", "#a8cf6a", "#6ecf8a", "#34c98d"];

const DONUT_SEGMENTS = [
  { pct: 0.45, color: "#f5a35c" },
  { pct: 0.35, color: "#34c98d" },
  { pct: 0.2, color: "#8b6ee6" },
];

const CUSTOMERS = [
  { id: 1, name: "Rohit Sharma", email: "rohit@example.com", img: "https://i.pravatar.cc/128?img=33" },
  { id: 2, name: "Priya Mehta", email: "priya@example.com", img: "https://i.pravatar.cc/128?img=47" },
  { id: 3, name: "Amit Verma", email: "amit@example.com", img: "https://i.pravatar.cc/128?img=12" },
];

function useCountUp(target, durationMs, start) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (!start) return;
    const startTime = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    function tick(now) {
      const p = Math.min((now - startTime) / durationMs, 1);
      setValue(Math.round(ease(p) * target));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [start, target, durationMs]);
  return value;
}

function StatCard({ stat, mounted, index }) {
  const count = useCountUp(stat.value, 1200 + index * 150, mounted);
  const Icon = stat.icon;
  return (
    <div className="cm-stat" style={{ "--stat-delay": `${0.15 + index * 0.1}s` }}>
      <div className="cm-stat-top">
        <div className="cm-stat-icon" style={{ background: stat.tintBg, color: stat.tint }}>
          <Icon />
        </div>
        <div className="cm-stat-delta" style={{ color: stat.tint }}>
          <ArrowUpIcon />
          {stat.delta}
        </div>
      </div>
      <div className="cm-stat-value">{count.toLocaleString("en-IN")}</div>
      <div className="cm-stat-label">{stat.label}</div>
    </div>
  );
}

export default function CustomerManagementCard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const donutRadius = 26;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let offsetAcc = 0;

  return (
    <div className="cm-root">
      <style>{`
        .cm-root {
          width: 100%;
          max-width: 420px;
          aspect-ratio: 1 / 1;
          margin: 0 auto;
          border-radius: 22px;
          background: #ffffff;
          border: 1px solid rgba(20,20,30,0.07);
          box-shadow: 0 26px 50px -28px rgba(20,20,40,0.18), 0 2px 6px rgba(20,20,40,0.04);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 9px;
          font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif;
          color: #1b1e2c;
          box-sizing: border-box;
          overflow: hidden;
        }

        .cm-search {
          display: flex;
          align-items: center;
          gap: 6px;
          border: 1px solid rgba(20,20,30,0.09);
          border-radius: 9px;
          padding: 6px 9px;
          color: #a4a8b4;
          opacity: 0;
          animation: cm-fadeUp 0.5s ease forwards;
          animation-delay: 0.05s;
        }

        .cm-search span { font-size: 9.5px; }

        .cm-stats { display: flex; gap: 7px; }

        .cm-stat {
          flex: 1;
          border-radius: 12px;
          background: rgba(20,20,30,0.02);
          border: 1px solid rgba(20,20,30,0.05);
          padding: 8px 9px;
          min-width: 0;
          opacity: 0;
          transform: translateY(8px);
          animation: cm-fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) forwards;
          animation-delay: var(--stat-delay);
        }

        .cm-stat-top { display: flex; align-items: center; justify-content: space-between; }

        .cm-stat-icon {
          width: 20px; height: 20px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }

        .cm-stat-delta {
          display: flex; align-items: center; gap: 1px;
          font-size: 8.5px; font-weight: 700;
        }

        .cm-stat-value {
          font-size: 15px;
          font-weight: 700;
          margin-top: 6px;
          letter-spacing: -0.01em;
          font-variant-numeric: tabular-nums;
        }

        .cm-stat-label {
          font-size: 8px;
          color: #9aa0ac;
          margin-top: 1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cm-panels { display: flex; gap: 8px; flex: 1; min-height: 0; }

        .cm-panel {
          border-radius: 12px;
          border: 1px solid rgba(20,20,30,0.06);
          padding: 8px 9px;
          display: flex;
          flex-direction: column;
          min-width: 0;
          opacity: 0;
          animation: cm-fadeUp 0.55s ease forwards;
        }

        .cm-panel-growth { flex: 1.3; animation-delay: 0.5s; }
        .cm-panel-type { flex: 1; align-items: center; overflow: hidden; animation-delay: 0.6s; }

        .cm-panel-title { font-size: 9px; font-weight: 600; color: #555a68; }

        .cm-bars {
          flex: 1;
          display: flex;
          align-items: flex-end;
          gap: 3.5px;
          margin-top: 4px;
        }

        .cm-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; gap: 2px; }

        .cm-bar {
          width: 100%;
          border-radius: 2px 2px 1px 1px;
          transform: scaleY(0);
          transform-origin: bottom;
          animation:
            cm-growBar 0.6s cubic-bezier(0.22,1,0.36,1) forwards,
            cm-breathe 2.8s ease-in-out infinite;
          animation-delay: var(--bar-delay), calc(var(--bar-delay) + 0.6s);
        }

        .cm-bar-month { font-size: 6.5px; color: #b3b7c2; }

        .cm-donut-wrap { position: relative; width: min(62px, 100%); aspect-ratio: 1; margin-top: 4px; flex: none; }

        .cm-donut-svg { display: block; width: 100%; height: 100%; animation: cm-spin 14s linear infinite; transform-origin: center; }

        .cm-donut-center {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
        }

        .cm-donut-core {
          width: 22px; height: 22px; border-radius: 50%; background: #fff;
          box-shadow: 0 0 0 1px rgba(20,20,30,0.04);
        }

        .cm-legend { display: flex; gap: 6px; margin-top: 5px; flex-wrap: wrap; justify-content: center; }
        .cm-legend-dot { width: 5px; height: 5px; border-radius: 50%; display: inline-block; margin-right: 2px; }
        .cm-legend-item { font-size: 6.5px; color: #9aa0ac; display: flex; align-items: center; }

        .cm-list {
          display: flex;
          flex-direction: column;
          gap: 5px;
          opacity: 0;
          animation: cm-fadeUp 0.55s ease forwards;
          animation-delay: 0.75s;
        }

        .cm-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 5px 7px;
          border-radius: 10px;
          animation: cm-scan 9s ease-in-out infinite;
          animation-delay: var(--row-delay);
        }

        .cm-avatar {
          width: 24px; height: 20px; min-width: 24px;
          border-radius: 50%;
          object-fit: cover;
          border: 1.5px solid #fff;
          box-shadow: 0 0 0 1px rgba(20,20,30,0.08);
        }

        .cm-row-main { flex: 1; min-width: 0; }
        .cm-row-name { font-size: 10px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cm-row-email { font-size: 8px; color: #9aa0ac; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .cm-pill {
          font-size: 7.5px;
          font-weight: 600;
          color: #2f9e6e;
          background: rgba(52,201,141,0.12);
          padding: 2px 7px;
          border-radius: 999px;
          flex: none;
          animation: cm-pillPulse 2.4s ease-in-out infinite;
        }

        .cm-dots { color: #c4c7d0; flex: none; }

        @keyframes cm-fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes cm-growBar { from { transform: scaleY(0); } to { transform: scaleY(1); } }

        @keyframes cm-breathe {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.9); }
        }

        @keyframes cm-spin {
          from { transform: rotate(-90deg); }
          to { transform: rotate(270deg); }
        }

        @keyframes cm-scan {
          0%, 85%, 100% { background: transparent; }
          90% { background: rgba(139,110,230,0.06); }
        }

        @keyframes cm-pillPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }

        @media (prefers-reduced-motion: reduce) {
          .cm-stat, .cm-panel, .cm-list, .cm-row, .cm-bar, .cm-search, .cm-pill, .cm-donut-svg {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      <div className="cm-search">
        <SearchIcon />
        <span>Search customers...</span>
      </div>

      <div className="cm-stats">
        {STATS.map((s, i) => (
          <StatCard stat={s} mounted={mounted} index={i} key={s.key} />
        ))}
      </div>

      <div className="cm-panels">
        <div className="cm-panel cm-panel-growth">
          <div className="cm-panel-title">Growth</div>
          <div className="cm-bars">
            {BAR_HEIGHTS.map((h, i) => (
              <div className="cm-bar-col" key={i}>
                <div
                  className="cm-bar"
                  style={{ height: `${h}%`, background: BAR_COLORS[i], "--bar-delay": `${0.55 + i * 0.05}s` }}
                />
                <div className="cm-bar-month">{MONTHS[i]}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="cm-panel cm-panel-type">
          <div className="cm-panel-title">By type</div>
          <div className="cm-donut-wrap">
            <svg width="62" height="62" viewBox="0 0 64 64" className="cm-donut-svg">
              {DONUT_SEGMENTS.map((seg, i) => {
                const dash = donutCircumference * seg.pct;
                const gap = donutCircumference - dash;
                const rotation = (offsetAcc / donutCircumference) * 360;
                offsetAcc += dash;
                return (
                  <circle
                    key={i}
                    cx="32"
                    cy="32"
                    r={donutRadius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="9"
                    strokeDasharray={`${dash} ${gap}`}
                    transform={`rotate(${rotation} 32 32)`}
                  />
                );
              })}
            </svg>
            <div className="cm-donut-center"><div className="cm-donut-core" /></div>
          </div>
          <div className="cm-legend">
            {DONUT_SEGMENTS.map((seg, i) => (
              <span className="cm-legend-item" key={i}>
                <span className="cm-legend-dot" style={{ background: seg.color }} />
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="cm-list">
        {CUSTOMERS.map((c, i) => (
          <div className="cm-row" key={c.id} style={{ "--row-delay": `${i * 1.2}s` }}>
            <img className="cm-avatar" src={c.img} alt="" />
            <div className="cm-row-main">
              <div className="cm-row-name">{c.name}</div>
              <div className="cm-row-email">{c.email}</div>
            </div>
            <span className="cm-pill" style={{ animationDelay: `${i * 0.3}s` }}>Active</span>
            <MoreVerticalIcon className="cm-dots" />
          </div>
        ))}
      </div>
    </div>
  );
}
