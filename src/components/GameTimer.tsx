import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";

export type GamePhase = "betting" | "locked" | "resolving";

interface GameTimerProps {
  onPhaseChange: (phase: GamePhase) => void;
  onResolutionComplete: () => void;
  onPriceSnapshot: () => void;
}

const BETTING_DURATION = 50; // 50 seconds for betting
const LOCK_DURATION = 10; // 10 seconds locked
const RESOLUTION_DURATION = 60; // 60 seconds to resolve

const GameTimer = ({ onPhaseChange, onResolutionComplete, onPriceSnapshot }: GameTimerProps) => {
  const [phase, setPhase] = useState<GamePhase>("betting");
  const [timeLeft, setTimeLeft] = useState(BETTING_DURATION);
  const hasSnapshotted = useRef(false);

  const getTotalDuration = useCallback(() => {
    switch (phase) {
      case "betting": return BETTING_DURATION;
      case "locked": return LOCK_DURATION;
      case "resolving": return RESOLUTION_DURATION;
    }
  }, [phase]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Phase transition
          if (phase === "betting") {
            setPhase("locked");
            onPhaseChange("locked");
            return LOCK_DURATION;
          } else if (phase === "locked") {
            setPhase("resolving");
            onPhaseChange("resolving");
            hasSnapshotted.current = false;
            return RESOLUTION_DURATION;
          } else {
            // Resolution complete - take price snapshot
            if (!hasSnapshotted.current) {
              onPriceSnapshot();
              hasSnapshotted.current = true;
            }
            onResolutionComplete();
            setPhase("betting");
            onPhaseChange("betting");
            return BETTING_DURATION;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, onPhaseChange, onResolutionComplete, onPriceSnapshot]);

  const progress = (timeLeft / getTotalDuration()) * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const isUrgent = phase === "locked" || (phase === "betting" && timeLeft <= 10);
  const isResolving = phase === "resolving";

  const getPhaseLabel = () => {
    switch (phase) {
      case "betting": return timeLeft <= 10 ? "Closing Soon" : "Place Bets";
      case "locked": return "Bets Locked";
      case "resolving": return "Checking Price";
    }
  };

  const getPhaseColor = () => {
    switch (phase) {
      case "betting": return timeLeft <= 10 ? "hsl(var(--warning))" : "hsl(var(--primary))";
      case "locked": return "hsl(var(--danger))";
      case "resolving": return "hsl(var(--secondary))";
    }
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* Phase Label */}
      <motion.div
        key={phase}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 px-4 py-1 rounded-full bg-background/50 border border-border"
      >
        <span 
          className="text-sm font-medium uppercase tracking-wider"
          style={{ color: getPhaseColor() }}
        >
          {getPhaseLabel()}
        </span>
      </motion.div>

      {/* Circular Progress */}
      <div className="relative w-32 h-32 md:w-40 md:h-40">
        {/* Background Circle */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="4"
          />
          {/* Progress Circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={getPhaseColor()}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              filter: `drop-shadow(0 0 10px ${getPhaseColor()})`,
            }}
            transition={{ duration: 0.3 }}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span 
            className="text-4xl md:text-5xl font-display font-bold"
            style={{ 
              color: getPhaseColor(),
              textShadow: `0 0 20px ${getPhaseColor()}`,
            }}
            animate={isUrgent ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5, repeat: isUrgent ? Infinity : 0 }}
          >
            {timeLeft}
          </motion.span>
          <span className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
            seconds
          </span>
        </div>
      </div>

      {/* Phase Indicator Dots */}
      <div className="mt-4 flex gap-2">
        {(["betting", "locked", "resolving"] as GamePhase[]).map((p) => (
          <div
            key={p}
            className={`h-1.5 w-8 rounded-full transition-all duration-300`}
            style={{
              backgroundColor: p === phase ? getPhaseColor() : 'hsl(var(--muted))',
              boxShadow: p === phase ? `0 0 10px ${getPhaseColor()}` : 'none',
            }}
          />
        ))}
      </div>

      {/* Phase Description */}
      <p className="mt-3 text-xs text-muted-foreground text-center max-w-[200px]">
        {phase === "betting" && "Place your bets now!"}
        {phase === "locked" && "No more bets allowed"}
        {phase === "resolving" && "Waiting for price update..."}
      </p>
    </div>
  );
};

export default GameTimer;
