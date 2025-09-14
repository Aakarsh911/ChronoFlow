"use client";
import { useEffect, useState, useCallback, useRef } from 'react';
import { signIn } from 'next-auth/react';
import dynamic from 'next/dynamic';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { UnifiedEvent } from '../../lib/events/types';
import { useCalendarRange } from './hooks/useCalendarRange';
import { useEventCache } from './hooks/useEventCache';
import { useCalendarMetas } from './hooks/useCalendarMetas';

const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });

interface Props { initialEvents: UnifiedEvent[]; initialNeedsReconnect?: boolean }

export default function CalendarClient({ initialEvents, initialNeedsReconnect = false }: Props) {
  const [events, setEvents] = useState<UnifiedEvent[]>(initialEvents);
  const [loading, setLoading] = useState(false);
  const [needsReconnect, setNeedsReconnect] = useState(initialNeedsReconnect);
  const calendarApiRef = useRef<any>(null);
  const { cacheRef, updateCache, getSubset } = useEventCache();
  const { calendarMetas, buildMetas, toggle } = useCalendarMetas();
  const [currentRangeInternal, setCurrentRangeInternal] = useState<{start: Date; end: Date} | null>(null);

  const refresh = useCallback(async (rangeOverride?: { start: Date; end: Date }) => {
    setLoading(true);
    try {
      const r = rangeOverride || currentRangeInternal;
      const qs = r ? `?start=${encodeURIComponent(r.start.toISOString())}&end=${encodeURIComponent(r.end.toISOString())}` : '';
      const url = '/api/calendar/events' + qs + (qs ? '&' : '?') + 'bufferWeeks=3';
      const res = await fetch(url);
      const json = await res.json();
      setEvents(json.events || []);
      setNeedsReconnect(!!json.meta?.needsReconnect);
      updateCache(json.meta?.fetchedRange, json.events || []);
      buildMetas(json.events || []);
      if (process.env.NODE_ENV === 'development') {
        const evs = json.events || [];
        const allDay = evs.filter((e: any) => e.allDay).length;
        console.log('[calendar debug] events fetched', evs.length, 'allDay', allDay, qs || '(no-range)');
        if (evs.length) console.log('[calendar sample]', evs[0]);
      }
    } finally { setLoading(false); }
  }, [currentRangeInternal, updateCache, buildMetas]);

  const { currentRange, setCurrentRange, onDatesSet } = useCalendarRange(initialEvents.length, refresh);

  useEffect(() => { setCurrentRangeInternal(currentRange); }, [currentRange]);
  // Attempt to capture calendar API after mount if ref assignment not available via props typings
  useEffect(() => {
    if (calendarApiRef.current) return;
    try {
      const el = document.querySelector('.fc');
      // FullCalendar's React wrapper stores internal calendar instance on a property of the component, but
      // since we couldn't use the ref prop due to TS typing, we rely on datesSet (which always fires once) to retrieve view range
      // and we call methods through activeStart/activeEnd (navigation unaffected). We'll populate calendarApiRef once datesSet fires.
    } catch {}
  }, []);

  useEffect(() => { const id = setInterval(() => refresh(), 120000); return () => clearInterval(id); }, [refresh]);

  useEffect(() => {
    if (!needsReconnect && initialEvents.length === 0 && currentRange) {
      refresh();
    }
  }, [needsReconnect, initialEvents.length, currentRange, refresh]);

  function nav(dir: 'prev' | 'next' | 'today') {
    const api = calendarApiRef.current;
    if (!api) return;
    
    if (dir === 'today') api.today();
    else if (dir === 'prev') api.prev();
    else if (dir === 'next') api.next();
    
    // Update current range after navigation
  const newRange = { start: api.view.activeStart, end: api.view.activeEnd };
  setCurrentRange(newRange);
  const subset = getSubset(newRange);
  if (subset) setEvents(subset);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[calendar nav]', dir, {
        newStart: newRange.start.toISOString(),
        newEnd: newRange.end.toISOString()
      });
    }
  }

  function formattedRange() {
    if (!currentRange) return '';
    const { start, end } = currentRange;
    const sameMonth = start.getMonth() === end.getMonth() || (end.getDate() <= 7 && start.getMonth() + 1 === end.getMonth());
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    if (sameMonth) return `${start.toLocaleDateString(undefined, { month: 'long' })} ${start.getFullYear()}`;
    return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
  }

  return (
    <div className="h-full flex flex-col bg-transparent">
      <div className="flex items-center gap-4 px-4 h-12">
        <div className="flex items-center gap-1">
          <button onClick={() => nav('prev')} className="h-8 w-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600" aria-label="Previous week">‹</button>
          <button onClick={() => nav('next')} className="h-8 w-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600" aria-label="Next week">›</button>
          <button onClick={() => nav('today')} className="ml-1 text-sm px-3 h-8 rounded border border-gray-300 bg-white/80 hover:bg-white text-gray-800 font-medium shadow-sm">Today</button>
        </div>
        <div className="font-semibold text-gray-800 select-none text-sm">{formattedRange()}</div>
        <div className="ml-auto flex items-center gap-4">
          <button onClick={() => refresh()} className="text-xs px-3 h-8 rounded border border-teal-500 text-teal-700 bg-white hover:bg-teal-50 disabled:opacity-50 shadow-sm" disabled={loading}>{loading ? 'Refreshing' : 'Refresh'}</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="w-full mx-auto h-full">
          <div className="h-full rounded-xl border bg-white shadow-sm flex flex-col">
            <div className="px-4 py-2 border-b flex items-center justify-between">
              <div className="text-xs font-semibold tracking-wide text-gray-700">Calendar</div>
              {calendarMetas.length > 1 && (
                <div className="hidden md:flex items-center gap-3">
                  {calendarMetas.map(meta => (
                    <button
                      key={meta.id}
                      onClick={() => toggle(meta.id)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] bg-white hover:bg-teal-50 transition-colors ${meta.enabled ? 'text-gray-800' : 'text-gray-400'} `}
                    >
                      <span className="inline-block w-2.5 h-2.5 rounded" style={{ background: meta.color, filter: meta.enabled ? 'none' : 'grayscale(80%) brightness(1.1)' }} />
                      <span className="truncate max-w-[5rem] font-medium tracking-wide">{meta.summary}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-hidden relative">
    { /* ref retained intentionally */ }
    {FullCalendar && (
      <FullCalendar
          {...({ ref: (ref: any) => { if (ref) { calendarApiRef.current = ref.getApi(); } } } as any)}
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          height="100%"
          nowIndicator
          allDaySlot={true}
          slotMinTime='00:00:00'
          slotMaxTime='24:00:00'
          events={events
            .filter(e => {
              const meta = calendarMetas.find(m => m.id === (e.calendarId || 'primary'));
              return !meta || meta.enabled;
            })
            .map(e => {
              const meta = calendarMetas.find(m => m.id === (e.calendarId || 'primary'));
              const color = meta?.color || '#0d9488';
              return { id: e.id, title: e.title, start: e.start, end: e.end, allDay: e.allDay, backgroundColor: color, borderColor: color, textColor: '#fff' };
            })}
          eventClassNames={() => ['!border-0','rounded-sm','px-1','py-[2px]','text-[11px]','font-medium','shadow-sm']}
          headerToolbar={false}
          dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
          slotLabelFormat={{ hour: 'numeric', minute: '2-digit', hour12: true }}
          datesSet={onDatesSet as any}
    />
  )}
        {needsReconnect && (
          <div className="absolute inset-0 z-20 flex items-center justify-center text-sm text-gray-500 bg-white/60 backdrop-blur-[2px]">
            <div className="bg-white border rounded-md shadow-lg p-4 flex flex-col items-center gap-2">
              <span className="text-xs text-gray-600">Google access expired. Reconnect to continue.</span>
              <button onClick={() => signIn('google', { callbackUrl: '/calendar', prompt: 'consent', access_type: 'offline' })} className="text-xs px-3 py-1 rounded bg-teal-600 text-white hover:bg-teal-700">Reconnect Google</button>
            </div>
          </div>
        )}
    {!needsReconnect && events.length === 0 && !loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-gray-400">
      No events. {" "}
      <span className="pointer-events-auto ml-2 text-teal-600 underline cursor-pointer" onClick={() => refresh()}>Retry</span>
          </div>
        )}
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        .fc .fc-scrollgrid, .fc-theme-standard td, .fc-theme-standard th { border-color: #e5e7eb; }
        .fc .fc-timegrid-slot { height: 2.5rem; }
        .fc-timegrid-axis-cushion, .fc .fc-col-header-cell-cushion { font-size: 10px; color:#6b7280; }
        .fc .fc-timegrid-axis-cushion { text-transform: uppercase; }
        .fc .fc-timegrid-slot-label { font-size:10px; color:#9ca3af; }
        .fc .fc-day-today { background: #f0f9ff !important; }
        .fc .fc-timegrid-now-indicator-line { border-color:#0d9488; }
      `}</style>
    </div>
  );
}