import { useEffect, useRef } from "react";
import gsap from "gsap";

const EMPLOYEES = [
  { initials: "AM", name: "Aarav Mehta", role: "UI Designer", salary: 52000, date: "28 Sep", hue: 212 },
  { initials: "PS", name: "Priya Sharma", role: "Developer", salary: 68000, date: "30 Sep", hue: 340 },
  { initials: "RV", name: "Rohan Verma", role: "Sales Lead", salary: 45000, date: "30 Sep", hue: 155 },
  { initials: "SR", name: "Sneha Rawat", role: "Accounts", salary: 38000, date: "1 Oct", hue: 32 },
  { initials: "KN", name: "Karan Negi", role: "Support", salary: 32000, date: "1 Oct", hue: 268 },
];
const currency = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const TOTAL = EMPLOYEES.reduce((sum, employee) => sum + employee.salary, 0);
const Check = ({ className }) => <svg className={className} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.5l2.4 2.4L9.5 3.6" /></svg>;

const CSS = `
:where(.ec-root) *,:where(.ec-root) *:before,:where(.ec-root) *:after{box-sizing:border-box;margin:0;padding:0}
.ec-root{position:relative;width:100%;aspect-ratio:1;container-type:inline-size;font-family:inherit;-webkit-font-smoothing:antialiased}.ec-card{position:absolute;inset:0;overflow:hidden;border:1px solid #ffffff14;border-radius:5cqw;color:#f3f3f3;background:linear-gradient(180deg,#272727,#202020);box-shadow:inset 0 1px #ffffff0d}.ec-inner{position:absolute;inset:0;display:flex;flex-direction:column;gap:3.6cqw;padding:5.2cqw}
.ec-head,.ec-progress,.ec-row{display:flex;align-items:center}.ec-head{align-items:flex-start;justify-content:space-between;gap:3cqw}.ec-label{display:flex;align-items:center;gap:1.5cqw;color:#ffffff80;font-size:2.9cqw}.ec-live,.ec-chip-dot{width:1.5cqw;height:1.5cqw;flex:none;border-radius:50%;background:#74dca0}.ec-live{animation:ec-pulse 2s ease-out infinite}.ec-amount{display:flex;align-items:baseline;gap:1.4cqw;margin-top:1.2cqw;white-space:nowrap}.ec-paid-amt{font-size:7.4cqw;font-weight:600;line-height:1.05;letter-spacing:-.035em;font-variant-numeric:tabular-nums}.ec-total,.ec-count{color:#ffffff6b;font-size:2.9cqw}
.ec-btn-wrap{position:relative;flex:none}.ec-btn{position:relative;display:flex;align-items:center;justify-content:center;gap:1.4cqw;min-width:19cqw;height:7.8cqw;overflow:hidden;border:1px solid transparent;border-radius:999px;background:#f3f3f3;color:#161616;font-size:3cqw;font-weight:600;white-space:nowrap}.ec-btn[data-state=busy]{border-color:#ffffff1f;background:#ffffff14;color:#e6e6e6}.ec-btn[data-state=done]{background:#74dca024;color:#74dca0}.ec-spinner,.ec-btn-check,.ec-chip-check{display:none;flex:none}.ec-spinner{width:2.8cqw;height:2.8cqw;border:.45cqw solid #ffffff38;border-top-color:#fff;border-radius:50%;animation:ec-spin .8s linear infinite}.ec-btn-check{width:3cqw;height:3cqw}.ec-btn[data-state=busy] .ec-spinner,.ec-btn[data-state=done] .ec-btn-check{display:block}.ec-ripple{position:absolute;top:62%;left:58%;width:10cqw;height:10cqw;margin:-5cqw 0 0 -5cqw;border-radius:50%;background:#0003;opacity:0}.ec-cursor{position:absolute;z-index:5;top:62%;left:58%;width:5.4cqw;height:5.4cqw;opacity:0;pointer-events:none;filter:drop-shadow(0 .6cqw 1cqw #0008)}.ec-cursor svg{width:100%;height:100%}
.ec-progress{gap:3cqw}.ec-bar{height:1.3cqw;flex:1;overflow:hidden;border-radius:999px;background:#ffffff14}.ec-bar-fill{width:100%;height:100%;transform:scaleX(0);transform-origin:left;border-radius:inherit;background:#74dca0}.ec-count{min-width:15cqw;text-align:right;font-size:2.8cqw;white-space:nowrap}.ec-list{display:flex;flex:1;min-height:0;flex-direction:column;gap:1cqw}.ec-row{flex:1;min-height:0;max-height:14cqw;gap:3cqw;padding:0 2.6cqw;border:1px solid #ffffff0f;border-radius:3cqw;background:#ffffff08}.ec-av{display:grid;width:7.6cqw;height:7.6cqw;flex:none;place-items:center;border-radius:50%;background:linear-gradient(135deg,hsl(var(--ec-h) 38% 36%),hsl(var(--ec-h) 36% 22%));box-shadow:inset 0 0 0 1px #ffffff1f;color:hsl(var(--ec-h) 85% 90%);font-size:2.8cqw;font-weight:600}.ec-info{min-width:0;flex:1}.ec-name{overflow:hidden;color:#f4f4f4;font-size:3.4cqw;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.ec-role,.ec-date{margin-top:.3cqw;color:#ffffff73;font-size:2.7cqw}.ec-pay{flex:none;text-align:right}.ec-salary{font-size:3.3cqw;font-weight:600;font-variant-numeric:tabular-nums}.ec-date{font-size:2.6cqw}
.ec-chip{display:flex;width:15.6cqw;height:5.6cqw;flex:none;align-items:center;justify-content:center;gap:1.1cqw;border-radius:999px;font-size:2.6cqw;font-weight:600}.ec-chip[data-state=due]{color:#e3b45d;background:#e3b45d1f}.ec-chip[data-state=paying]{color:#8db6ff;background:#8db6ff21}.ec-chip[data-state=paid]{color:#74dca0;background:#74dca021}.ec-chip[data-state=paying] .ec-chip-dot{animation:ec-blink 1s ease-in-out infinite}.ec-chip[data-state=paid] .ec-chip-dot{display:none}.ec-chip[data-state=paid] .ec-chip-check{display:block;width:2.6cqw;height:2.6cqw}.ec-toast-wrap{position:absolute;right:0;bottom:5.5cqw;left:0;z-index:4;display:flex;justify-content:center;pointer-events:none}.ec-toast{display:flex;align-items:center;gap:2cqw;padding:2cqw 4cqw 2cqw 2.2cqw;border:1px solid #ffffff1f;border-radius:999px;background:#121212c7;box-shadow:0 2cqw 5cqw #00000073;color:#f3f3f3;font-size:3.1cqw;font-weight:500;opacity:0;white-space:nowrap}.ec-toast-icon{display:grid;width:5.4cqw;height:5.4cqw;place-items:center;border-radius:50%;background:#74dca02e;color:#74dca0}.ec-toast-icon svg{width:3cqw;height:3cqw}
/* Reserve a dedicated bottom lane for the confirmation toast. */
.ec-inner{padding-bottom:15cqw}
.ec-inner{padding-top:6.5cqw}
.ec-root{overflow:hidden;border-radius:5cqw}
.ec-card{border-radius:inherit}
.ec-list{justify-content:space-between;gap:1.6cqw}
.ec-root .ec-av{overflow:hidden;background-color:#29313a;background-position:center;background-size:cover}
.ec-root .ec-row:nth-child(1) .ec-av{background-image:url("https://i.pravatar.cc/160?img=12")}
.ec-root .ec-row:nth-child(2) .ec-av{background-image:url("https://i.pravatar.cc/160?img=47")}
.ec-root .ec-row:nth-child(3) .ec-av{background-image:url("https://i.pravatar.cc/160?img=33")}
.ec-root .ec-row:nth-child(4) .ec-av{background-image:url("https://i.pravatar.cc/160?img=44")}
.ec-root .ec-row:nth-child(5) .ec-av{background-image:url("https://i.pravatar.cc/160?img=68")}
.ec-root .ec-av{color:transparent;font-size:0}
@container (max-width:360px){
  .ec-inner{gap:3cqw;padding:6.5cqw 5.2cqw}
  .ec-list{gap:1.4cqw;justify-content:space-between}
  .ec-row{flex:none;min-height:11.8cqw}
  .ec-av{width:8.2cqw;height:8.2cqw}
  .ec-name{font-size:3.65cqw;line-height:1.2}
  .ec-role,.ec-date{font-size:2.85cqw;line-height:1.25}
  .ec-salary{font-size:3.55cqw;line-height:1.2}
  .ec-toast-wrap{display:none}
}
@container (max-width:220px){
  .ec-inner{gap:3px;padding:8px}
  .ec-head{gap:6px}
  .ec-label{gap:3px;font-size:7px}
  .ec-live{width:4px;height:4px}
  .ec-amount{gap:4px;margin-top:2px}
  .ec-paid-amt{font-size:19px}
  .ec-total{font-size:7px}
  .ec-btn{min-width:48px;height:19px;padding:0 7px;font-size:7px}
  .ec-progress{gap:6px}
  .ec-bar{height:3px}
  .ec-count{min-width:43px;font-size:6px}
  .ec-list{gap:2px}
  .ec-row{min-height:20px;max-height:none;gap:5px;padding:0 4px}
  .ec-av{width:16px;height:16px}
  .ec-name{font-size:7px;line-height:1.12}
  .ec-role,.ec-date{margin-top:0;font-size:6px;line-height:1.1}
  .ec-salary{font-size:7px;line-height:1.1}
  .ec-chip{width:37px;height:15px;gap:3px;font-size:6px}
  .ec-chip-dot{width:3px;height:3px}
}
@keyframes ec-pulse{0%{box-shadow:0 0 0 0 #74dca080}70%,100%{box-shadow:0 0 0 1.8cqw #74dca000}}@keyframes ec-spin{to{transform:rotate(360deg)}}@keyframes ec-blink{50%{opacity:.25}}@media(prefers-reduced-motion:reduce){.ec-live,.ec-spinner,.ec-chip-dot{animation:none!important}}
`;

export default function EmployeeManagementCard() {
  const rootRef = useRef(null);
  useEffect(() => {
    const root = rootRef.current;
    const $ = (selector) => root.querySelector(selector);
    const rows = [...root.querySelectorAll(".ec-row")];
    const paidAmount = $(".ec-paid-amt"), count = $(".ec-count"), fill = $(".ec-bar-fill"), button = $(".ec-btn"), label = $(".ec-btn-label"), cursor = $(".ec-cursor"), ripple = $(".ec-ripple"), toast = $(".ec-toast"), inner = $(".ec-inner"), head = $(".ec-head"), progress = $(".ec-progress");
    const chipText = { due: "Due", paying: "Paying", paid: "Paid" };
    const setChip = (row, state) => { const chip = row.querySelector(".ec-chip"); chip.dataset.state = state; chip.querySelector(".ec-chip-text").textContent = chipText[state]; };
    const reset = () => { rows.forEach((row) => setChip(row, "due")); button.dataset.state = "idle"; label.textContent = "Pay all"; paidAmount.textContent = currency(0); count.textContent = `0 of ${rows.length} paid`; };
    const tl = gsap.timeline({ paused:true, repeat:-1, defaults:{ ease:"power3.out" } });
    tl.call(reset, null, 0).set(inner, { opacity:1 }, 0).fromTo(head, { y:14, opacity:0 }, { y:0, opacity:1, duration:.6 }, 0).fromTo(progress, { y:14, opacity:0 }, { y:0, opacity:1, duration:.6 }, .1).fromTo(rows, { y:18, opacity:0 }, { y:0, opacity:1, duration:.55, stagger:.08 }, .2);
    tl.fromTo(cursor, { left:"190%", top:"520%", opacity:0 }, { left:"58%", top:"62%", opacity:1, duration:1, ease:"power2.inOut" }, 1.25).to(button, { scale:.93, duration:.1 }, 2.3).to(button, { scale:1, duration:.4, ease:"back.out(3)" }, 2.4).fromTo(ripple, { scale:0, opacity:.5 }, { scale:1.7, opacity:0, duration:.6 }, 2.3).call(() => { button.dataset.state = "busy"; label.textContent = "Paying"; }, null, 2.4).to(cursor, { opacity:0, duration:.35 }, 2.75);
    const counter = { value:0 }; let cumulative = 0;
    rows.forEach((row, i) => { const start = 2.65 + i * .75, done = start + .5, chip = row.querySelector(".ec-chip"); cumulative += Number(row.dataset.salary); const amount = cumulative; tl.call(() => setChip(row, "paying"), null, start).to(row, { backgroundColor:"rgba(255,255,255,.075)", borderColor:"rgba(255,255,255,.16)", duration:.25 }, start).call(() => setChip(row, "paid"), null, done).to(chip, { scale:1.14, duration:.14 }, done).to(chip, { scale:1, duration:.4, ease:"back.out(3)" }, done+.14).to(counter, { value:amount, duration:.7, ease:"power2.out", onUpdate:() => { paidAmount.textContent = currency(counter.value); } }, done).to(fill, { scaleX:(i + 1) / rows.length, duration:.7 }, done).call(() => { count.textContent = `${i + 1} of ${rows.length} paid`; }, null, done).to(row, { backgroundColor:"rgba(255,255,255,.03)", borderColor:"rgba(255,255,255,.06)", duration:.5 }, done+.35); });
    const finish = 2.65 + (rows.length - 1) * .75 + 1.3;
    tl.call(() => { button.dataset.state = "done"; label.textContent = "Paid"; }, null, finish).fromTo(toast, { y:16, opacity:0, scale:.96 }, { y:0, opacity:1, scale:1, duration:.5, ease:"back.out(1.6)" }, finish).addLabel("hold", finish+.6).to(toast, { y:10, opacity:0, duration:.4 }, finish+2.2).to(inner, { opacity:0, duration:.5 }, finish+2.5).to({}, { duration:.4 }, finish+3);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { tl.seek("hold", false).pause(); return () => tl.revert(); }
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting ? tl.play() : tl.pause(), { threshold:.25 });
    observer.observe(root);
    return () => { observer.disconnect(); tl.revert(); };
  }, []);
  return <div className="ec-root" ref={rootRef} role="img" aria-label="Employee payroll dashboard preview"><style>{CSS}</style><div className="ec-card"><div className="ec-inner"><div className="ec-head"><div><div className="ec-label"><span className="ec-live" />Paid this month</div><div className="ec-amount"><span className="ec-paid-amt">₹0</span><span className="ec-total">of {currency(TOTAL)}</span></div></div><div className="ec-btn-wrap"><div className="ec-btn" data-state="idle"><span className="ec-spinner" /><Check className="ec-btn-check" /><span className="ec-btn-label">Pay all</span><span className="ec-ripple" /></div><div className="ec-cursor"><svg viewBox="0 0 24 24"><path d="M4 2l15 9.5-6.6 1.4L9.6 20 4 2z" fill="#fff" stroke="#111" strokeWidth="1.5" strokeLinejoin="round" /></svg></div></div></div><div className="ec-progress"><div className="ec-bar"><div className="ec-bar-fill" /></div><div className="ec-count">0 of {EMPLOYEES.length} paid</div></div><div className="ec-list">{EMPLOYEES.map((employee) => <div className="ec-row" key={employee.name} data-salary={employee.salary}><div className="ec-av" style={{ "--ec-h": employee.hue }}>{employee.initials}</div><div className="ec-info"><div className="ec-name">{employee.name}</div><div className="ec-role">{employee.role}</div></div><div className="ec-pay"><div className="ec-salary">{currency(employee.salary)}</div><div className="ec-date">{employee.date}</div></div><div className="ec-chip" data-state="due"><i className="ec-chip-dot" /><Check className="ec-chip-check" /><span className="ec-chip-text">Due</span></div></div>)}</div></div><div className="ec-toast-wrap"><div className="ec-toast"><span className="ec-toast-icon"><Check /></span>{EMPLOYEES.length} salaries paid</div></div></div></div>;
}
