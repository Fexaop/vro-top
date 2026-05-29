export type CalendarEventType = 'Instructional' | 'Holiday' | 'Other';

export interface CalendarEvent {
  date: string;
  text: string;
  type: CalendarEventType;
  color?: string;
}

export interface CalendarMonth {
  month: number;
  year: number;
  events: CalendarEvent[];
}
