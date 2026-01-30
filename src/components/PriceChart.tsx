

import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useEthPrice } from "@/hooks/useEthPrice";

interface PriceChartProps {
  onPriceUpdate?: (price: number, change: number) => void;
}

const PriceChart = ({ onPriceUpdate }: PriceChartProps) => {
  const { price, change24h, priceHistory, isLoading, error } = useEthPrice();
  
  // Notify parent of price updates
  useEffect(() => {
    if (price > 0 && onPriceUpdate) {
      onPriceUpdate(price, change24h);
    }
  }, [price, change24h, onPriceUpdate]);

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

  const lastY = useMemo(() => {
    if (priceHistory.length === 0) return 50;
    const prices = priceHistory.map((p) => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    const lastPrice = priceHistory[priceHistory.length - 1].price;
    return 100 - 5 - ((lastPrice - minPrice) / priceRange) * 90;
  }, [priceHistory]);

  const isPositive = change24h >= 0;
  const gradientId = isPositive ? "chartGradientUp" : "chartGradientDown";
  const strokeColor = isPositive ? "hsl(145, 100%, 45%)" : "hsl(350, 100%, 55%)";

  // Only show loading for initial load, not during errors
  if (isLoading && priceHistory.length === 0) {
    return (
      <div className="relative w-full h-48 sm:h-56 md:h-64 overflow-hidden rounded-xl glass flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading price...</span>
        </div>
      </div>
    );
  }

  // Only show error if we have no data at all
  if (error && price === 0 && priceHistory.length === 0) {
    return (
      <div className="relative w-full h-48 sm:h-56 md:h-64 overflow-hidden rounded-xl glass flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-danger">
          <span className="text-xs">{error}</span>
          <span className="text-xs text-muted-foreground">Retrying...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-48 sm:h-56 md:h-64 overflow-hidden rounded-xl glass">
      {/* Background Grid - simplified for mobile */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" className="overflow-visible">
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-primary/20" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

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
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
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
          strokeWidth="0.6"
          filter="url(#glow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />

        {/* Current Price Dot */}
        {priceHistory.length > 0 && (
          <motion.circle
            cx="95"
            cy={lastY}
            r="1.2"
            fill={strokeColor}
            filter="url(#glow)"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </svg>

      {/* Price Info Overlay - Compact for mobile */}
      <div className="absolute top-3 left-3 z-10">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">ETH/USD</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl sm:text-3xl font-display font-bold text-foreground">
            ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
            isPositive 
              ? "bg-success/20 text-success" 
              : "bg-danger/20 text-danger"
          }`}>
            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            <span>{isPositive ? "+" : ""}{change24h.toFixed(2)}%</span>
          </div>
        </div>
      </div>

      {/* Live Indicator */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span>
        </span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Live</span>
      </div>
    </div>
  );
};

export default PriceChart;
