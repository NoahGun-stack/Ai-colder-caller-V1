
export enum LeadStatus {
  NOT_CALLED = 'Not Called',
  ATTEMPTED = 'Attempted',
  CONNECTED = 'Connected',
  NO_ANSWER = 'No Answer',
  NOT_INTERESTED = 'Not Interested',
  CALL_BACK_LATER = 'Call Back Later',
  APPOINTMENT_BOOKED = 'Appointment Booked',
  DO_NOT_CALL = 'Do Not Call'
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  source?: string;
  status: LeadStatus;
  lastCallDate?: string;
  totalCalls?: number;
  lastContactedAt?: string;
  lastOutcome?: string;
  tcpaAcknowledged: boolean;
  notes?: string;
}

// Retain alias for backward compatibility during refactor if needed, 
// though we aim to replace all usage.
export type Lead = Contact;


export interface CallLog {
  id: string;
  leadId: string;
  duration: number;
  timestamp: string;
  outcome: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  transcript: string;
  recordingUrl?: string;
}

export interface CampaignConfig {
  name: string;
  isActive: boolean;
  callingHours: { start: string; end: string };
  tone: 'Friendly' | 'Direct' | 'Conservative';
  voicemailMessage: string;
}

export interface DashboardMetrics {
  totalCalls: number;
  appointmentsBooked: number;
  conversionRate: number;
  costPerBooking: number;
  dailyCallStats: { day: string; count: number }[];
}
