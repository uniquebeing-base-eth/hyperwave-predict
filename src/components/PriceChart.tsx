import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";

interface PricePoint {
  time: number;
  price: number;
}

interface PriceChartProps {
  currentPrice: number;
  priceChange: number;
}

const PriceChart = ({ currentPrice, priceChange }: PriceChartProps) => {
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  
  // Generate initial price history
  useEffect(() => {
    const initialHistory: PricePoint[] = [];
    let basePrice = currentPrice;
    for (let i = 59; i >= 0; i--) {
      const variance = (Math.random() - 0.5) * 0.0005 * basePrice;
      basePrice = basePrice + variance;
      initialHistory.push({
        time: Date.now() - i * 1000,
        price: basePrice,
      });
    }
    setPriceHistory(initialHistory);
  }, []);

  // Update price history every second
  useEffect(() => {
    const interval = setInterval(() => {
      setPriceHistory((prev) => {
        const newHistory = [...prev.slice(1)];
        const lastPrice = prev[prev.length - 1]?.price || currentPrice;
        const variance = (Math.random() - 0.5) * 0.0003 * lastPrice;
        newHistory.push({
          time: Date.now(),
          price: lastPrice + variance,
        });
        return newHistory;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentPrice]);

  // Calculate chart dimensions and path
  const chartPath = useMemo(() => {
    if (priceHistory.length < 2) return "";

    const prices = priceHistory.map((p) => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    const width = 100;
    const height = 100;
    const padding = 5;

    const points = priceHistory.map((point, index) => {
      const x = padding + (index / (priceHistory.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((point.price - minPrice) / priceRange) * (height - 2 * padding);
      return { x, y };
    });

    const pathData = points
      .map((point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        
        // Smooth curve using quadratic bezier
        const prev = points[index - 1];
        const cpX = (prev.x + point.x) / 2;
        return `Q ${cpX} ${prev.y} ${point.x} ${point.y}`;
      })
      .join(" ");

    return pathData;
  }, [priceHistory]);

  const areaPath = useMemo(() => {
    if (!chartPath) return "";
    return `${chartPath} L 95 100 L 5 100 Z`;
  }, [chartPath]);

  const isPositive = priceChange >= 0;
  const gradientId = isPositive ? "chartGradientUp" : "chartGradientDown";
  const strokeColor = isPositive ? "hsl(145, 100%, 45%)" : "hsl(350, 100%, 55%)";

  return (
    <div className="relative w-full h-64 md:h-80 overflow-hidden rounded-2xl glass">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%" className="overflow-visible">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary/30" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Scanning Line Effect */}
      <div className="absolute inset-0 scan-line pointer-events-none" />

      {/* Price Chart */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <linearGradient id="chartGradientUp" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(145, 100%, 45%)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(145, 100%, 45%)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="chartGradientDown" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(350, 100%, 55%)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(350, 100%, 55%)" stopOpacity="0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Area fill */}
        <motion.path
          d={areaPath}
          fill={`url(#${gradientId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        />

        {/* Line */}
        <motion.path
          d={chartPath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="0.5"
          filter="url(#glow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
        />

        {/* Current Price Dot */}
        {priceHistory.length > 0 && (
          <motion.circle
            cx="95"
            cy={(() => {
              const prices = priceHistory.map((p) => p.price);
              const minPrice = Math.min(...prices);
              const maxPrice = Math.max(...prices);
              const priceRange = maxPrice - minPrice || 1;
              const lastPrice = priceHistory[priceHistory.length - 1].price;
              return 100 - 5 - ((lastPrice - minPrice) / priceRange) * 90;
            })()}
            r="1.5"
            fill={strokeColor}
            filter="url(#glow)"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </svg>

      {/* Price Info Overlay */}
      <div className="absolute top-4 left-4 z-10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">ETH/USD</span>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl md:text-4xl font-display font-bold text-foreground">
            ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-semibold ${
            isPositive 
              ? "bg-success/20 text-success" 
              : "bg-danger/20 text-danger"
          }`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{isPositive ? "+" : ""}{priceChange.toFixed(4)}%</span>
          </div>
        </div>
      </div>

      {/* Live Indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
        </span>
        <span className="text-xs text-muted-foreground uppercase tracking-wider">Live</span>
      </div>
    </div>
  );
};

export default PriceChart;
