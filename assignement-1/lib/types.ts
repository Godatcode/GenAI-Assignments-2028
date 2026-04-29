export type PersonaId = "anshuman" | "abhimanyu" | "kshitij";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface PersonaMeta {
  id: PersonaId;
  name: string;
  title: string;
  initials: string;
  accent: string;
}
