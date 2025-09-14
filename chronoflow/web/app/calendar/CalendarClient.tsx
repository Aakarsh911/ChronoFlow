"use client";
import { useEffect, useState, useCallback, useRef } from 'react';
import { signIn } from 'next-auth/react';
import dynamic from 'next/dynamic';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { UnifiedEvent } from '../../lib/events/types';

const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });

interface Props { initialEvents: UnifiedEvent[]; initialNeedsReconnect?: boolean }

export default function CalendarClient({ initialEvents, initialNeedsReconnect = false }: Props) {
  const [events, setEvents] = useState<UnifiedEvent[]>(initialEvents);
  const [loading, setLoading] = useState(false);
  const [needsReconnect, setNeedsReconnect] = useState(initialNeedsReconnect);
  const calendarApiRef = useRef<any>(null);
  const [currentRange, setCurrentRange] = useState<{start: Date; end: Date} | null>(null);
  const initialRangeSetRef = useRef(false);
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

  const buildRangeQuery = (range?: { start: Date; end: Date } | null) => {
    const r = range || currentRange;
    if (!r) return '';
    return `?start=${encodeURIComponent(r.start.toISOString())}&end=${encodeURIComponent(r.end.toISOString())}`;
  };

  const refresh = useCallback(async (rangeOverride?: { start: Date; end: Date }) => {
    setLoading(true);
    try {
      const qs = buildRangeQuery(rangeOverride || currentRange);
      const res = await fetch('/api/calendar/events' + qs);
      const json = await res.json();
      setEvents(json.events || []);
      setNeedsReconnect(!!json.meta?.needsReconnect);
      if (process.env.NODE_ENV === 'development') {
        const evs = json.events || [];
        const allDay = evs.filter((e: any) => e.allDay).length;
        console.log('[calendar debug] events fetched', evs.length, 'allDay', allDay, qs || '(no-range)');
        if (evs.length) console.log('[calendar sample]', evs[0]);
      }
    } finally { setLoading(false); }
  }, [currentRange]);

  useEffect(() => {
    // periodic refresh every 2 minutes using current visible range
    const id = setInterval(() => refresh(), 120000);
    return () => clearInterval(id);
  }, [refresh]);

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
  // Immediately fetch events for new visible range
  refresh(newRange);
    
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
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center gap-4 px-4 h-12 border-b">
        <div className="flex items-center gap-1">
          <button onClick={() => nav('prev')} className="h-8 w-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600" aria-label="Previous week">‹</button>
          <button onClick={() => nav('next')} className="h-8 w-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600" aria-label="Next week">›</button>
          <button onClick={() => nav('today')} className="ml-1 text-sm px-3 h-8 rounded border border-gray-300 hover:bg-gray-50">Today</button>
        </div>
        <div className="font-semibold text-gray-800 select-none text-sm">{formattedRange()}</div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => refresh()} className="text-xs px-3 h-8 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50" disabled={loading}>{loading ? 'Refreshing' : 'Refresh'}</button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <FullCalendar
            ref={(ref: any) => {
                if (ref) {
                    calendarApiRef.current = ref.getApi();
                }
            }}
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          height="100%"
          nowIndicator
          allDaySlot={true}
          slotMinTime='00:00:00'
          slotMaxTime='24:00:00'
          events={events.map(e => ({ id: e.id, title: e.title, start: e.start, end: e.end, allDay: e.allDay }))}
          eventClassNames={(arg) => ['!bg-teal-500', '!border-0', '!text-white', 'rounded-sm', 'px-1', 'py-[2px]', 'text-[11px]', 'font-medium']}
          headerToolbar={false}
          dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
          slotLabelFormat={{ hour: 'numeric', minute: '2-digit', hour12: true }}
          datesSet={(arg) => {
            const newRange = { start: arg.start, end: arg.end };
            setCurrentRange(newRange);
            const first = !initialRangeSetRef.current;
            if (first) {
              initialRangeSetRef.current = true;
              if (process.env.NODE_ENV === 'development') {
                console.log('[datesSet initial]', { start: arg.start.toISOString(), end: arg.end.toISOString() });
              }
              // If there were no initial events, fetch now for this range
              if (initialEvents.length === 0) {
                refresh(newRange);
              }
            } else {
              // Range changed via navigation or other trigger; fetch events for new week
              refresh(newRange);
            }
            if (process.env.NODE_ENV === 'development') {
              console.log('[datesSet callback]', { start: arg.start.toISOString(), end: arg.end.toISOString(), viewType: arg.view.type });
            }
          }}
        />
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