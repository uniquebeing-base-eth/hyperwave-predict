

import { Gift, Zap, BarChart3, Trophy } from "lucide-react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";

const navItems = [
  { to: "/rewards", icon: Gift, label: "Rewards" },
  { to: "/", icon: Zap, label: "Action" },
  { to: "/leaderboard", icon: Trophy, label: "Leaders" },
  { to: "/stats", icon: BarChart3, label: "Stats" },
];

const BottomNav = () => {
  return (
    <motion.nav
      className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="flex items-center justify-evenly h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center p-2 transition-all duration-200 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            {({ isActive }) => (
              <div className="relative">
                <item.icon
                  className={`w-6 h-6 transition-all duration-200 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                {isActive && (
                  <motion.div
                    className="absolute inset-0 bg-primary/30 blur-xl -z-10"
                    layoutId="nav-glow"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1.5 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </motion.nav>
  );
};

export default BottomNav;
