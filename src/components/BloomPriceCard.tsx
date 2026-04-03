import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import { useBloomPrice } from "@/hooks/useBloomPrice";

const BloomPriceCard = () => {
  const { data, isLoading } = useBloomPrice();

  const isPositive = (data?.priceChange24h ?? 0) >= 0;

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(2)}M`
      : n >= 1_000
        ? `$${(n / 1_000).toFixed(1)}K`
        : `$${n.toFixed(2)}`;

  return (
    <motion.div
      className="glass rounded-xl p-4 border border-border/50"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold text-xs">B</span>
          </div>
          <div>
            <p className="font-display text-sm uppercase tracking-wider text-foreground">
              $BLOOM
            </p>
            <p className="text-[10px] text-muted-foreground">Base Network</p>
          </div>
        </div>
        {data?.pairUrl && (
          <a
            href={data.pairUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-6 bg-muted rounded w-24" />
          <div className="h-4 bg-muted rounded w-16" />
        </div>
      ) : (
        <>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-2xl font-display font-bold text-foreground">
              ${data?.priceUsd ? data.priceUsd < 0.01 ? data.priceUsd.toFixed(6) : data.priceUsd.toFixed(4) : "—"}
            </span>
            <span
              className={`flex items-center gap-0.5 text-sm font-semibold ${
                isPositive ? "text-success" : "text-danger"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              {Math.abs(data?.priceChange24h ?? 0).toFixed(2)}%
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-muted/30 rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground uppercase">Vol 24h</p>
              <p className="text-xs font-semibold text-foreground">
                {fmt(data?.volume24h ?? 0)}
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground uppercase">Liquidity</p>
              <p className="text-xs font-semibold text-foreground">
                {fmt(data?.liquidity ?? 0)}
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground uppercase">MCap</p>
              <p className="text-xs font-semibold text-foreground">
                {fmt(data?.marketCap ?? 0)}
              </p>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default BloomPriceCard;
