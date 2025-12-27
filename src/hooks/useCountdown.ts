import { useState, useEffect, useCallback } from "react";

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  isEnded: boolean;
}

export const useCountdown = (targetDate: Date): CountdownTime => {
  const calculateTimeLeft = useCallback((): CountdownTime => {
    const nowMs = Date.now();
    const targetMs = targetDate.getTime();
    const difference = targetMs - nowMs;

    if (difference <= 0 || Number.isNaN(difference)) {
      return { days: 0, hours: 0, minutes: 0, isEnded: true };
    }

    // Work in whole minutes to avoid any “carry”/display weirdness.
    const totalMinutes = Math.floor(difference / (1000 * 60));

    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    return { days, hours, minutes, isEnded: false };
  }, [targetDate]);

  const [timeLeft, setTimeLeft] = useState<CountdownTime>(calculateTimeLeft);

  useEffect(() => {
    // Tick frequently for stability, but display changes only when minutes change.
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    setTimeLeft(calculateTimeLeft());
    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  return timeLeft;
};

// Helper to get the end of the current phase (7 days from a start date)
export const getPhaseEndDate = (startDate: Date, daysPlayed: number): Date => {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + (7 - daysPlayed));
  return endDate;
};

// Helper to get end of current day (midnight)
export const getEndOfDay = (): Date => {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
};
