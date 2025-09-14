import { useState, useRef, useCallback } from 'react';

export function useCalendarRange(initialEventsLength: number, refresh: (range?: { start: Date; end: Date }) => void) {
  const [currentRange, setCurrentRange] = useState<{ start: Date; end: Date } | null>(null);
  const initialRangeSetRef = useRef(false);
  const debounceTimerRef = useRef<any>(null);

  const onDatesSet = useCallback((arg: { start: Date; end: Date; view: { type: string } }) => {
    const newRange = { start: arg.start, end: arg.end };
    setCurrentRange(newRange);
    const first = !initialRangeSetRef.current;
    if (first) {
      initialRangeSetRef.current = true;
      if (initialEventsLength === 0) refresh(newRange);
    } else {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => refresh(newRange), 250);
    }
  }, [initialEventsLength, refresh]);

  return { currentRange, setCurrentRange, onDatesSet };
}
