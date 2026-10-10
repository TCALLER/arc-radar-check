import { useEffect, useState } from 'react';

/**
 * Keeps the radar sweeping for at least `durationMs` after a check starts, so a fast response
 * never flickers past the scan.
 */
export const useMinimumScan = (durationMs: number) => {
  const [holdId, setHoldId] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  useEffect(() => {
    if (!isHolding) return;
    const timer = setTimeout(() => setIsHolding(false), durationMs);
    return () => clearTimeout(timer);
  }, [isHolding, holdId, durationMs]);

  const startHold = () => {
    setIsHolding(true);
    setHoldId((id) => id + 1);
  };

  return { isHolding, startHold };
};
