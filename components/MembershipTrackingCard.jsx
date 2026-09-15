import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus } from 'lucide-react';

// Odometer digit component for the smooth number scrolling effect
const AnimatedDigit = ({ value }) => {
  return (
    <div className="relative h-12 w-7 overflow-hidden">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className="absolute inset-0 flex items-center justify-center text-5xl font-bold text-white"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

const MembershipTrackingCard = () => {
  const [isActive, setIsActive] = useState(false);
  const [count, setCount] = useState(0);
  const [fallingItems, setFallingItems] = useState([]);

  // Simulation sequence for members joining when the card is clicked
  useEffect(() => {
    if (!isActive) return;

    const sequence = [
      { id: 1, delay: 400, add: 1, title: "New Subscriber" },
      { id: 2, delay: 1400, add: 2, title: "Pro Plan (x2)" },
      { id: 3, delay: 2400, add: 3, title: "Team Plan (x3)" },
      { id: 4, delay: 3600, add: 4, title: "Enterprise" },
    ];

    sequence.forEach((item) => {
      setTimeout(() => {
        // Drop the card down
        setFallingItems((prev) => [...prev, item]);
        
        // Remove the falling card and increment the counter when it "hits" the bottom
        setTimeout(() => {
          setFallingItems((prev) => prev.filter((i) => i.id !== item.id));
          setCount((c) => c + item.add);
        }, 800); 
      }, item.delay);
    });
  }, [isActive]);

  // Convert count to an array of digits for the odometer
  const digits = count.toString().padStart(2, '0').split('');

  return (
    <div className="flex items-center justify-center w-full h-[500px] bg-neutral-900/50 rounded-xl overflow-hidden relative">
      
      {/* Falling Elements Container */}
      <div className="absolute inset-x-0 top-0 bottom-32 flex flex-col items-center pointer-events-none">
        <AnimatePresence>
          {fallingItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ y: -50, opacity: 0, scale: 0.8 }}
              animate={{ y: 140, opacity: 1, scale: 1 }}
              exit={{ y: 250, opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 120, damping: 15 }}
              className="absolute flex items-center gap-3 p-3 mt-4 bg-neutral-800 rounded-xl shadow-2xl border border-neutral-700/50 min-w-[180px]"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400">
                <UserPlus size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="text-xs text-neutral-400">+{item.add} Members</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Main Square Feature Card */}
      <motion.div
        layout
        onClick={() => !isActive && setIsActive(true)}
        className="z-10 w-64 h-64 p-6 bg-neutral-800/90 backdrop-blur-md border border-neutral-700 rounded-3xl shadow-2xl flex flex-col justify-between cursor-pointer group hover:border-neutral-600 transition-colors"
      >
        {!isActive ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full text-center gap-3"
          >
            <div className="flex items-center justify-center w-14 h-14 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/20 text-white">
              <Users size={28} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white tracking-wide">Live Tracking</h3>
              <p className="text-sm text-neutral-400 mt-1">Click to simulate</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-full justify-between"
          >
            {/* Top Icon */}
            <div className="flex items-center justify-center w-12 h-12 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
              <Users size={24} />
            </div>
            
            {/* Bottom Counter */}
            <div className="flex items-end justify-between w-full">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-neutral-400 mb-1">
                  Total Members
                </span>
                <div className="flex font-mono">
                  {digits.map((digit, i) => (
                    <AnimatedDigit key={`${i}-${digit}`} value={digit} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default MembershipTrackingCard;
