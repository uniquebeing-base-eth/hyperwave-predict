import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Zap, TrendingUp, Gift, Trophy, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

const ONBOARDING_KEY = "bloom_onboarding_complete";

const slides = [
  {
    icon: Zap,
    title: "Welcome to Bloom",
    description:
      "A fast-paced prediction game on Base. Bet whether ETH will go UP or DOWN each round and win $BLOOM rewards!",
    tip: "Each round lasts a few minutes — quick, fun, and rewarding.",
  },
  {
    icon: Wallet,
    title: "Connect & Play",
    description:
      "Open in Farcaster to auto-connect your wallet. You'll need $BLOOM tokens to place bets — get them on Base DEX.",
    tip: "Your wallet connects seamlessly through Farcaster mini-app.",
  },
  {
    icon: TrendingUp,
    title: "Place Your Bet",
    description:
      "Choose UP 🟢 or DOWN 🔴 during the betting window. Once the round locks, watch the ETH price action in real time.",
    tip: "Bet with conviction — the odds shift based on pool distribution.",
  },
  {
    icon: Gift,
    title: "Earn Phase Rewards",
    description:
      "Rewards accumulate across 7-day phases. The longer your streak, the bigger your multiplier. Claim anytime!",
    tip: "Keep your streak alive for maximum rewards.",
  },
  {
    icon: Trophy,
    title: "Climb the Leaderboard",
    description:
      "Compete with other players for the top spot. Win rate, total profit, and bet volume all count toward rankings.",
    tip: "Check the Leaders tab to see where you stand.",
  },
];

const OnboardingTutorial = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((p) => p + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) setCurrentSlide((p) => p - 1);
  };

  if (!isOpen) return null;

  const slide = slides[currentSlide];
  const Icon = slide.icon;
  const isLast = currentSlide === slides.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative w-full max-w-sm glass rounded-2xl border border-border/50 overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          {/* Close */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 z-10 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 pt-8">
            {/* Icon */}
            <motion.div
              key={currentSlide}
              className="mx-auto w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-5"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 15 }}
            >
              <Icon className="w-8 h-8 text-primary" />
            </motion.div>

            {/* Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
                className="text-center"
              >
                <h3 className="text-lg font-display uppercase tracking-wider text-foreground mb-2">
                  {slide.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  {slide.description}
                </p>
                <div className="bg-primary/10 rounded-lg px-3 py-2">
                  <p className="text-xs text-primary font-medium">💡 {slide.tip}</p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Dots */}
            <div className="flex justify-center gap-1.5 mt-5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentSlide
                      ? "bg-primary w-6"
                      : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            {/* Nav */}
            <div className="flex items-center justify-between mt-5">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                disabled={currentSlide === 0}
                className="text-muted-foreground"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button size="sm" onClick={handleNext}>
                {isLast ? "Get Started" : "Next"}
                {!isLast && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingTutorial;
