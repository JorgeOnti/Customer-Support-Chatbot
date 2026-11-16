export type MessageRole = 'User' | 'Assistant';

export type TicketStatus = 'Open' | 'InProgress' | 'Resolved';

export interface SourceReference {
  id: number;
  title: string;
  category: string;
}

export interface KnowledgeEntry {
  id: number;
  title: string;
  content: string;
  category: string;
  isActive: boolean;
  updatedAt: string;
}

export interface KnowledgeEntryPayload {
  title: string;
  content: string;
  category: string;
  isActive: boolean;
}

export interface ChatMessageItem {
  id: number;
  role: MessageRole;
  content: string;
  createdAt: string;
  tokensUsed?: number | null;
  sources: SourceReference[];
}

export interface SupportTicket {
  id: number;
  conversationId: string;
  sessionId: string;
  customerName?: string | null;
  status: TicketStatus;
  summary: string;
  createdAt: string;
  messageCount: number;
  messages: ChatMessageItem[];
}

export interface ChatSessionResponse {
  conversationId?: string | null;
  sessionId: string;
  customerName?: string | null;
  startedAt?: string | null;
  messages: ChatMessageItem[];
  activeTicket?: SupportTicket | null;
}

export interface ChatRequestPayload {
  sessionId: string;
  message: string;
  customerName?: string;
}

export interface ChatResponsePayload {
  reply: string;
  sources: SourceReference[];
  offerHandoff: boolean;
  tokensUsed: number;
  createdAt: string;
}

export interface EscalateRequestPayload {
  customerName?: string;
  reason?: string;
}

export interface EscalateResponsePayload {
  ticket: SupportTicket;
  confirmationMessage: ChatMessageItem;
}

export interface ConversationSummary {
  id: string;
  sessionId: string;
  customerName?: string | null;
  startedAt: string;
  lastActivityAt: string;
  messageCount: number;
  totalTokensUsed: number;
  hasTicket: boolean;
  latestTicketId?: number | null;
  latestTicketStatus?: TicketStatus | null;
  messages: ChatMessageItem[];
}

export interface HealthStatus {
  status: string;
  service: string;
  openAiConfigured: boolean;
  timestamp: string;
}
