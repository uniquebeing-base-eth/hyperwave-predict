import { useState, useEffect, useCallback } from "react";

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  isEnded: boolean;
}

export const useCountdown = (targetDate: Date): CountdownTime => {
  const calculateTimeLeft = useCallback((): CountdownTime => {
    const now = new Date();
    const difference = targetDate.getTime() - now.getTime();

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, isEnded: true };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes, isEnded: false };
  }, [targetDate]);

  const [timeLeft, setTimeLeft] = useState<CountdownTime>(calculateTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000); // Update every minute

    // Initial calculation
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
