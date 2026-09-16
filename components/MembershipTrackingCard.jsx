const MEMBERS = [
  { id: 1, name: "Sarah Chen", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop" },
  { id: 2, name: "Mike Johnson", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop" },
  { id: 3, name: "Emma Davis", img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop" },
  { id: 4, name: "James Wilson", img: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop" },
  { id: 5, name: "Lisa Anderson", img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop" },
  { id: 6, name: "David Martinez", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop" },
  { id: 7, name: "Jennifer Taylor", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop" },
  { id: 8, name: "Robert Brown", img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=300&fit=crop" },
  { id: 9, name: "Amanda White", img: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=300&h=300&fit=crop" },
];

const RADIUS = 150; // px, distance from center
const CARD = 84; // px, card size
const DURATION = 26; // seconds per full orbit

export default function OrbitingAvatars() {
  const n = MEMBERS.length;

  return (
    <div className="ob-root">
      <style>{`
        .ob-root {
          width: 100%;
          max-width: 460px;
          aspect-ratio: 1 / 1;
          margin: 0 auto;
          border-radius: 26px;
          background: radial-gradient(circle at 50% 45%, #111214 0%, #000000 70%);
          box-shadow: 0 30px 60px -28px rgba(0,0,0,0.6);
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ob-stage {
          position: relative;
          width: ${RADIUS * 2 + CARD}px;
          height: ${RADIUS * 2 + CARD}px;
          max-width: 92%;
          max-height: 92%;
        }

        .ob-ring {
          position: absolute;
          inset: 0;
          animation: ob-spin-cw ${DURATION}s linear infinite;
        }

        .ob-item {
          position: absolute;
          top: 50%;
          left: 50%;
          width: ${CARD}px;
          height: ${CARD}px;
          margin-top: ${-CARD / 2}px;
          margin-left: ${-CARD / 2}px;
        }

        .ob-item-inner {
          width: 100%;
          height: 100%;
          border-radius: 18px;
          overflow: hidden;
          border: 2.5px solid rgba(255,255,255,0.9);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.06), 0 14px 30px -10px rgba(0,0,0,0.7);
          animation: ob-spin-ccw ${DURATION}s linear infinite;
        }

        .ob-item-inner img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        @keyframes ob-spin-cw {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes ob-spin-ccw {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .ob-ring, .ob-item-inner { animation: none !important; }
        }
      `}</style>

      <div className="ob-stage">
        <div className="ob-ring">
          {MEMBERS.map((member, i) => {
            const angle = (360 / n) * i;
            return (
              <div
                className="ob-item"
                key={member.id}
                style={{ transform: `rotate(${angle}deg) translate(${RADIUS}px) rotate(${-angle}deg)` }}
              >
                <div className="ob-item-inner">
                  <img src={member.img} alt={member.name} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}