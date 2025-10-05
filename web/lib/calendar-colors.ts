// Calendar color utilities
export const CALENDAR_COLORS = {
  primary: '#3b82f6',
  secondary: '#6366f1',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  teal: '#14b8a6',
  orange: '#f97316',
  emerald: '#059669',
  blue: '#0ea5e9',
  violet: '#7c3aed',
}

export const DEFAULT_CALENDAR_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Yellow
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
]

export function getCalendarColorFromId(calendarId: string, calendars: Array<{ id: string; backgroundColor?: string }>) {
  const calendar = calendars.find(cal => cal.id === calendarId)
  
  if (calendar?.backgroundColor) {
    return calendar.backgroundColor
  }
  
  // Generate a consistent color based on calendar ID
  const hash = calendarId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0)
    return a & a
  }, 0)
  
  const colorIndex = Math.abs(hash) % DEFAULT_CALENDAR_COLORS.length
  return DEFAULT_CALENDAR_COLORS[colorIndex]
}

export function getContrastTextColor(backgroundColor: string): string {
  // Convert hex to RGB
  const hex = backgroundColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  return luminance > 0.5 ? '#1f2937' : '#ffffff'
}

export function getLighterColor(color: string, opacity: number = 0.1): string {
  // Convert to rgba with specified opacity
  const hex = color.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}
