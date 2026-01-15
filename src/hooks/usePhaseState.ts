import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PhaseState {
  phaseNumber: number;
  phaseStartedAt: Date;
  daysRemaining: number;
  daysCompleted: number;
  phaseEndDate: Date;
  isLoading: boolean;
  refetch: () => void;
}

/**
 * Hook to get the global phase state from the database.
 * All users share the same 7-day phase cycle.
 * After 7 days, Phase 2 starts, and so on.
 */
export const usePhaseState = (): PhaseState => {
  const [phaseNumber, setPhaseNumber] = useState(1);
  const [phaseStartedAt, setPhaseStartedAt] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    const fetchPhaseState = async () => {
      try {
        const { data, error } = await supabase
          .from("phase_state")
          .select("*")
          .eq("id", 1)
          .single();

        if (error) {
          console.error("Error fetching phase state:", error);
          return;
        }

        if (data) {
          setPhaseNumber(data.phase_number);
          setPhaseStartedAt(new Date(data.phase_started_at));
        }
      } catch (err) {
        console.error("Error fetching phase state:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPhaseState();
  }, [refreshKey]);

  // Calculate days remaining and phase end date
  const { daysRemaining, daysCompleted, phaseEndDate } = useMemo(() => {
    const now = new Date();
    const startMs = phaseStartedAt.getTime();
    const elapsedMs = now.getTime() - startMs;
    const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));

    const daysCompleted = Math.min(elapsedDays, 7);
    const daysRemaining = Math.max(7 - elapsedDays, 0);

    // Phase end = phase start + 7 days
    const phaseEndDate = new Date(startMs + 7 * 24 * 60 * 60 * 1000);

    return { daysRemaining, daysCompleted, phaseEndDate };
  }, [phaseStartedAt]);

  return {
    phaseNumber,
    phaseStartedAt,
    daysRemaining,
    daysCompleted,
    phaseEndDate,
    isLoading,
    refetch,
  };
};
