import type { User } from "@supabase/supabase-js";

export interface DbEmail {
  id: string;
  sender: string;
  subject: string;
  body: string | null;
  snippet: string | null;
  category: string | null;
  intent: string | null;
  sentiment: string | null;
  risk_score: number | null;
  summary: string | null;
  entities: unknown;
  received_at: string;
  account_id: string | null;
  provider_message_id: string | null;
  analyzed_at: string | null;
  archived_at: string | null;
  reported_at: string | null;
  risk_reason: string | null;
}

export interface DbAccount {
  id: string;
  provider: string;
  email: string;
  display_name: string | null;
  status: string;
  last_synced_at: string | null;
}

export interface UserSettings {
  phishingSensitivity: number;
  urgencySensitivity: number;
  noiseSensitivity: number;
  autoSummarizeThreads: boolean;
  dailyDigest: boolean;
  aiReplies: boolean;
  whitelist: string[];
  blacklist: string[];
  pushNotifications: boolean;
  emailDigest: boolean;
  slackAlerts: boolean;
  quietStart: string;
  quietEnd: string;
  telegramDigestTime: string;
  whatsappDigestTime: string;
  kappelasDigestTime: string;
  timezone: string;
  /** null ou 0 = désactivé ; 5 = purge auto après 5 jours */
  autoCleanupAfterDays: number | null;
}

export interface DataResult {
  loading: boolean;
  error: Error | null;
}

export interface UserResult extends DataResult {
  user: User | null;
}
