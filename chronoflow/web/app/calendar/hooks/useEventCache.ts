import { useRef, useCallback } from 'react';
import { UnifiedEvent } from '../../../lib/events/types';

export function useEventCache() {
  const cacheRef = useRef<{ range: { start: Date; end: Date }; events: UnifiedEvent[] } | null>(null);

  const updateCache = useCallback((fetchedRange: { timeMin?: string; timeMax?: string } | undefined, events: UnifiedEvent[]) => {
    if (fetchedRange?.timeMin && fetchedRange?.timeMax) {
      cacheRef.current = { range: { start: new Date(fetchedRange.timeMin), end: new Date(fetchedRange.timeMax) }, events };
    }
  }, []);

  const getSubset = useCallback((range: { start: Date; end: Date }) => {
    if (!cacheRef.current) return null;
    const { range: r, events } = cacheRef.current;
    if (range.start >= r.start && range.end <= r.end) {
      return events.filter(ev => {
        const evStart = new Date(ev.start);
        const evEnd = new Date(ev.end);
        return evStart < range.end && evEnd > range.start;
      });
    }
    return null;
  }, []);

  return { cacheRef, updateCache, getSubset };
}
