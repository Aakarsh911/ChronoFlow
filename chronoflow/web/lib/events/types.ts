export type CalendarProvider = 'gcal' | 'teams';

export interface UnifiedEvent {
  id: string;
  provider: CalendarProvider;
  calendarId?: string;
  title: string;
  start: string; // ISO
  end: string;   // ISO
  allDay?: boolean;
  // raw provider payload for debugging / later enrichment (never send to client in entirety if sensitive)
  raw?: any;
}

export interface ProviderFetchContext {
  userId: string;
  // future: tenant/org id, preferences, filtering options
}
