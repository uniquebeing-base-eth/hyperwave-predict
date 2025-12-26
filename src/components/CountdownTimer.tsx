import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface CountdownTimerProps {
  duration: number; // in seconds
  onComplete: () => void;
  isActive: boolean;
}

const CountdownTimer = ({ duration, onComplete, isActive }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [phase, setPhase] = useState<"betting" | "locked" | "result">("betting");

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onComplete();
          return duration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, duration, onComplete]);

  useEffect(() => {
    if (timeLeft > 10) {
      setPhase("betting");
    } else if (timeLeft > 0) {
      setPhase("locked");
    } else {
      setPhase("result");
    }
  }, [timeLeft]);

  const progress = (timeLeft / duration) * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const isUrgent = timeLeft <= 10;

  return (
    <div className="relative flex flex-col items-center">
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
            stroke={isUrgent ? "hsl(var(--danger))" : "hsl(var(--primary))"}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              filter: isUrgent 
                ? "drop-shadow(0 0 10px hsl(350 100% 55% / 0.6))" 
                : "drop-shadow(0 0 10px hsl(180 100% 50% / 0.6))",
            }}
            transition={{ duration: 0.3 }}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span 
            className={`text-4xl md:text-5xl font-display font-bold ${
              isUrgent ? "text-danger text-glow-danger" : "text-primary text-glow-primary"
            }`}
            animate={isUrgent ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5, repeat: isUrgent ? Infinity : 0 }}
          >
            {timeLeft}
          </motion.span>
          <span className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
            {phase === "betting" ? "Betting Open" : phase === "locked" ? "Locking" : "Result"}
          </span>
        </div>
      </div>

      {/* Phase Indicator */}
      <div className="mt-4 flex gap-2">
        {["betting", "locked", "result"].map((p) => (
          <div
            key={p}
            className={`h-1.5 w-8 rounded-full transition-all duration-300 ${
              p === phase 
                ? isUrgent && p === "locked"
                  ? "bg-danger glow-danger"
                  : "bg-primary glow-primary"
                : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default CountdownTimer;
