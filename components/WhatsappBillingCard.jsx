import { useEffect, useState } from "react";
import { Check, CheckCheck, Mic, Paperclip, Video, Phone, ReceiptText } from "lucide-react";

const CYCLE = 9200;

const CUSTOMER = {
  name: "Meera Kapoor",
  img: "https://i.pravatar.cc/200?img=47",
};

function tickStateAt(t) {
  if (t < 2200) return "sent";
  if (t < 3000) return "delivered";
  return "read";
}

export default function WhatsappBillingCard() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((previous) => (previous + 100) % CYCLE);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const showTyping = elapsed >= 300 && elapsed < 1400;
  const showInvoice = elapsed >= 1400;
  const showReply1 = elapsed >= 3600;
  const showReply2 = elapsed >= 4800;
  const showBadge = elapsed >= 5600;
  const fadeOut = elapsed >= 8600;
  const tick = tickStateAt(elapsed);

  return (
    <div className="wb-root">
      <style>{`
        .wb-root {
          width: 100%;
          max-width: 420px;
          aspect-ratio: 1 / 1;
          margin: 0 auto;
          border-radius: 22px;
          background: #ffffff;
          border: 1px solid rgba(20,20,30,0.07);
          box-shadow: 0 26px 50px -28px rgba(20,20,40,0.2), 0 2px 6px rgba(20,20,40,0.04);
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif;
          color: #1b1e2c;
          box-sizing: border-box;
          overflow: hidden;
        }

        .wb-eyebrow { font-size: 10px; font-weight: 600; color: #8b8fa3; padding: 0 2px; }

        .wb-phone {
          flex: 1;
          min-height: 0;
          border-radius: 16px;
          background-color: #ECE5DD;
          background-image: radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px);
          background-size: 13px 13px;
          border: 1px solid rgba(20,20,30,0.06);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .wb-header { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: linear-gradient(135deg, #0B6E5C, #075E54); }
        .wb-avatar-wrap { position: relative; flex: none; }
        .wb-root .wb-avatar { width: 26px; height: 26px; min-width: 26px; min-height: 26px; margin: 0; border-radius: 50%; object-fit: cover; object-position: center; transform: none; }
        .wb-online-dot { position: absolute; bottom: -1px; right: -1px; width: 7px; height: 7px; border-radius: 50%; background: #25D366; border: 1.5px solid #fff; animation: wb-pulse 2.2s ease-in-out infinite; }
        .wb-header-main { flex: 1; min-width: 0; }
        .wb-header-name { font-size: 10.5px; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .wb-header-status { font-size: 7.5px; color: #BFEBD6; margin-top: 1px; font-weight: 600; }
        .wb-header-icons { display: flex; gap: 10px; color: rgba(255,255,255,0.85); flex: none; }
        .wb-chat { flex: 1; min-height: 0; padding: 10px; display: flex; flex-direction: column; gap: 6px; justify-content: flex-end; transition: opacity 0.4s ease; }
        .wb-row { display: flex; }
        .wb-row.out { justify-content: flex-end; }
        .wb-row.in { justify-content: flex-start; }
        .wb-bubble-in { background: #ffffff; border: 1px solid rgba(20,20,30,0.06); border-radius: 11px 11px 11px 3px; padding: 6px 9px; max-width: 74%; font-size: 9px; box-shadow: 0 2px 6px -3px rgba(20,20,40,0.15); opacity: 0; transform: translateY(6px); animation: wb-slideIn 0.4s ease forwards; }
        .wb-bubble-out { background: #DCF8C6; border-radius: 11px 11px 3px 11px; padding: 8px 10px; max-width: 80%; opacity: 0; transform: translateY(6px) scale(0.97); animation: wb-slideIn 0.45s cubic-bezier(0.22,1,0.36,1) forwards; }
        .wb-invoice-title { font-size: 9px; font-weight: 700; display: flex; align-items: center; gap: 4px; }
        .wb-invoice-line { font-size: 8px; color: #4a4f5c; margin-top: 3px; display: flex; justify-content: space-between; gap: 10px; }
        .wb-invoice-amount { font-size: 12px; font-weight: 750; margin-top: 4px; }
        .wb-invoice-due { font-size: 7px; color: #6b7280; margin-top: 1px; }
        .wb-invoice-btn { margin-top: 6px; background: #25D366; color: #fff; font-size: 7.5px; font-weight: 700; text-align: center; padding: 4px 0; border-radius: 7px; }
        .wb-meta { display: flex; align-items: center; justify-content: flex-end; gap: 3px; margin-top: 4px; }
        .wb-meta-time { font-size: 6.5px; color: #6b7280; }
        .wb-tick { transition: color 0.35s ease; }
        .wb-typing-bubble { background: #DCF8C6; border-radius: 11px 11px 3px 11px; padding: 8px 12px; display: flex; gap: 3px; align-items: center; opacity: 0; animation: wb-slideIn 0.3s ease forwards; }
        .wb-typing-dot { width: 4.5px; height: 4.5px; border-radius: 50%; background: #6b8f6b; animation: wb-bounce 1.1s ease-in-out infinite; }
        .wb-typing-dot:nth-child(2) { animation-delay: 0.15s; }
        .wb-typing-dot:nth-child(3) { animation-delay: 0.3s; }
        .wb-badge-wrap { display: flex; justify-content: center; padding: 2px 0 0; }
        .wb-badge { display: flex; align-items: center; gap: 6px; background: #ffffff; border: 1px solid rgba(37,211,102,0.35); border-radius: 999px; padding: 5px 11px 5px 6px; box-shadow: 0 10px 22px -14px rgba(37,211,102,0.6); opacity: 0; transform: scale(0.7); animation: wb-popIn 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .wb-badge-icon { width: 18px; height: 18px; border-radius: 50%; background: #25D366; display: flex; align-items: center; justify-content: center; color: #fff; position: relative; flex: none; }
        .wb-badge-icon::after { content: ""; position: absolute; inset: -4px; border-radius: 50%; border: 1.5px solid rgba(37,211,102,0.4); animation: wb-ring 1.8s ease-out infinite; }
        .wb-badge-text { font-size: 8.5px; font-weight: 700; color: #1b1e2c; }
        .wb-badge-sub { font-size: 7px; color: #6b7280; font-weight: 500; }
        .wb-input-bar { display: flex; align-items: center; gap: 7px; padding: 7px 9px; background: #ffffff; border-top: 1px solid rgba(20,20,30,0.06); }
        .wb-input-pill { flex: 1; background: #F0F2F0; border-radius: 999px; padding: 6px 10px; font-size: 8px; color: #9aa0ac; display: flex; align-items: center; gap: 6px; }
        .wb-mic-btn { width: 22px; height: 22px; border-radius: 50%; background: #25D366; display: flex; align-items: center; justify-content: center; color: #fff; flex: none; animation: wb-breathe 2.6s ease-in-out infinite; }
        @media (max-width: 480px) {
          .wb-root { padding: 8px; gap: 6px; border-radius: 16px; }
          .wb-eyebrow { font-size: 8px; }
          .wb-phone { border-radius: 12px; }
          .wb-header { gap: 6px; padding: 6px 8px; }
          .wb-root .wb-avatar { width: 22px; height: 22px; min-width: 22px; min-height: 22px; }
          .wb-header-name { font-size: 9px; }
          .wb-header-status { font-size: 6.5px; }
          .wb-header-icons { gap: 7px; }
          .wb-chat { padding: 7px; gap: 4px; }
          .wb-bubble-in { padding: 5px 7px; font-size: 8px; }
          .wb-bubble-out { padding: 6px 8px; }
          .wb-invoice-title { font-size: 8px; }
          .wb-invoice-line { font-size: 7px; }
          .wb-invoice-amount { font-size: 10px; }
          .wb-invoice-due { font-size: 6px; }
          .wb-invoice-btn { margin-top: 4px; font-size: 6.5px; padding: 3px 0; }
          .wb-input-bar { gap: 5px; padding: 5px 7px; }
          .wb-input-pill { padding: 5px 8px; font-size: 7px; }
          .wb-mic-btn { width: 19px; height: 19px; }
        }
        @keyframes wb-slideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes wb-popIn { from { opacity: 0; transform: scale(0.7); } 60% { opacity: 1; transform: scale(1.06); } to { opacity: 1; transform: scale(1); } }
        @keyframes wb-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.5; } 30% { transform: translateY(-3px); opacity: 1; } }
        @keyframes wb-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(0.8); opacity: 0.6; } }
        @keyframes wb-ring { 0% { transform: scale(0.8); opacity: 0.7; } 100% { transform: scale(1.6); opacity: 0; } }
        @keyframes wb-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        @media (prefers-reduced-motion: reduce) { .wb-online-dot, .wb-typing-dot, .wb-badge-icon::after, .wb-mic-btn, .wb-bubble-in, .wb-bubble-out, .wb-badge, .wb-typing-bubble { animation: none !important; opacity: 1 !important; transform: none !important; } }
      `}</style>

      <div className="wb-eyebrow">Auto-billing via WhatsApp</div>
      <div className="wb-phone">
        <div className="wb-header">
          <div className="wb-avatar-wrap">
            <img className="wb-avatar" src={CUSTOMER.img} alt="" />
            <span className="wb-online-dot" />
          </div>
          <div className="wb-header-main">
            <div className="wb-header-name">{CUSTOMER.name}</div>
            <div className="wb-header-status">online</div>
          </div>
          <div className="wb-header-icons"><Video size={12} /><Phone size={11} /></div>
        </div>

        <div className="wb-chat" style={{ opacity: fadeOut ? 0 : 1 }}>
          {showTyping && <div className="wb-row out"><div className="wb-typing-bubble"><span className="wb-typing-dot" /><span className="wb-typing-dot" /><span className="wb-typing-dot" /></div></div>}
          {showInvoice && (
            <div className="wb-row out">
              <div className="wb-bubble-out">
                <div className="wb-invoice-title"><ReceiptText size={11} /> Invoice #1042</div>
                <div className="wb-invoice-line"><span>Salon package</span><span>₹2,450</span></div>
                <div className="wb-invoice-amount">₹2,450</div>
                <div className="wb-invoice-due">Due in 3 days</div>
                <div className="wb-invoice-btn">Pay now</div>
                <div className="wb-meta"><span className="wb-meta-time">10:24 AM</span>{tick === "sent" && <Check size={11} className="wb-tick" color="#6b7280" />}{tick !== "sent" && <CheckCheck size={11} className="wb-tick" color={tick === "read" ? "#34B7F1" : "#6b7280"} />}</div>
              </div>
            </div>
          )}
          {showReply1 && <div className="wb-row in"><div className="wb-bubble-in">Got it, paying now</div></div>}
          {showReply2 && <div className="wb-row in"><div className="wb-bubble-in">Paid ₹2,450 via UPI</div></div>}
          {showBadge && <div className="wb-badge-wrap"><div className="wb-badge"><div className="wb-badge-icon"><Check size={11} strokeWidth={3} /></div><div><div className="wb-badge-text">Payment received</div><div className="wb-badge-sub">₹2,450 · Invoice #1042</div></div></div></div>}
        </div>

        <div className="wb-input-bar">
          <div className="wb-input-pill"><Paperclip size={10} />Message</div>
          <div className="wb-mic-btn"><Mic size={11} /></div>
        </div>
      </div>
    </div>
  );
}
