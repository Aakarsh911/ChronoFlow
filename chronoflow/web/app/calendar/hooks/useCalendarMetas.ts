import { useState, useCallback } from 'react';
import { UnifiedEvent } from '../../../lib/events/types';

const palette = ['#0d9488','#6366f1','#dc2626','#d97706','#2563eb','#7c3aed','#059669','#db2777','#0891b2','#f59e0b'];

export function useCalendarMetas() {
  const [calendarMetas, setCalendarMetas] = useState<{ id: string; summary: string; color: string; enabled: boolean }[]>([]);

  const buildMetas = useCallback((events: UnifiedEvent[]) => {
    setCalendarMetas(prev => {
      const enabledLookup = new Map(prev.map(p => [p.id, p.enabled]));
      const map = new Map<string, string>();
      events.forEach(e => {
        const id = e.calendarId || 'primary';
        const summary = e.raw?.calendarSummary || id;
        if (!map.has(id)) map.set(id, summary);
      });
      return Array.from(map.entries()).map(([id, summary]) => {
        let hash = 0; for (let i=0;i<id.length;i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
        const color = palette[hash % palette.length];
        return { id, summary, color, enabled: enabledLookup.has(id) ? !!enabledLookup.get(id) : true };
      });
    });
  }, []);

  const toggle = useCallback((id: string) => {
    setCalendarMetas(ms => ms.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
  }, []);

  return { calendarMetas, buildMetas, toggle };
}
