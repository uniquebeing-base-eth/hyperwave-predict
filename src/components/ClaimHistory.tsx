import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import { History, ExternalLink, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface ClaimRow {
  id: string;
  phase_number: number;
  amount: number;
  multiplier: number;
  tx_hash: string | null;
  claimed_at: string;
  confirmed_at: string | null;
}

const ClaimHistory = () => {
  const { address } = useAccount();
  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("phase_claims")
        .select("id, phase_number, amount, multiplier, tx_hash, claimed_at, confirmed_at")
        .eq("wallet_address", address.toLowerCase())
        .not("confirmed_at", "is", null)
        .order("claimed_at", { ascending: false })
        .limit(25);
      if (!cancelled) {
        setRows((data as ClaimRow[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address]);

  if (!address) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-accent" />
          <h3 className="font-display uppercase tracking-wider text-sm">Claim History</h3>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No claims yet. Claim your first phase reward above.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => {
              const date = new Date(r.claimed_at);
              const dateStr = date.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const timeStr = date.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-lg bg-background/40 border border-border/40 px-3 py-2"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">Phase {r.phase_number}</span>
                      {r.multiplier > 1 && (
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px] border-accent/60 text-accent">
                          <Sparkles className="w-3 h-3 mr-0.5" />
                          {r.multiplier}x
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {dateStr} • {timeStr}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-mono text-accent">
                      +{Number(r.amount).toLocaleString()} $BLOOM
                    </span>
                    {r.tx_hash && (
                      <a
                        href={`https://basescan.org/tx/${r.tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-muted-foreground hover:text-accent inline-flex items-center gap-0.5"
                      >
                        tx <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </motion.div>
  );
};

export default ClaimHistory;
