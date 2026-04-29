export type PersonaId = "anshuman" | "abhimanyu" | "kshitij";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface PersonaMeta {
  id: PersonaId;
  name: string;
  initials: string;
  role: string;
  location: string;
  tagline: string;
  pullQuote: string;
  knownFor: string[];
  suggestions: string[];
  accent: string;
  accentSoft: string;
  accentInk: string;
}
