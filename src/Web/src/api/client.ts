import type {
  ChatRequestPayload,
  ChatResponsePayload,
  ChatSessionResponse,
  ConversationSummary,
  EscalateRequestPayload,
  EscalateResponsePayload,
  HealthStatus,
  KnowledgeEntry,
  KnowledgeEntryPayload,
  SupportTicket,
  TicketStatus,
} from '../types/api';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      'Unable to reach the Fork & Flame support API. Verify the backend server is running on ' +
        API_BASE_URL +
        '.',
      0,
      'NETWORK_ERROR'
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await response.json().catch(() => null) : await response.text().catch(() => '');

  if (!response.ok) {
    const message =
      (body && typeof body === 'object' && ('message' in body ? body.message : body.error)) ||
      (typeof body === 'string' && body.trim()) ||
      `Request failed with HTTP ${response.status}.`;
    const code =
      body && typeof body === 'object' && 'code' in body && typeof body.code === 'string'
        ? body.code
        : undefined;
    throw new ApiError(String(message), response.status, code);
  }

  return body as T;
}

export const apiClient = {
  getHealth(): Promise<HealthStatus> {
    return request<HealthStatus>('/api/health');
  },

  sendChatMessage(payload: ChatRequestPayload): Promise<ChatResponsePayload> {
    return request<ChatResponsePayload>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getChatHistory(sessionId: string): Promise<ChatSessionResponse> {
    return request<ChatSessionResponse>(`/api/chat/${encodeURIComponent(sessionId)}`);
  },

  escalateChat(sessionId: string, payload?: EscalateRequestPayload): Promise<EscalateResponsePayload> {
    return request<EscalateResponsePayload>(`/api/chat/${encodeURIComponent(sessionId)}/escalate`, {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    });
  },

  getKnowledgeEntries(params?: { search?: string; category?: string }): Promise<KnowledgeEntry[]> {
    const query = new URLSearchParams();
    if (params?.search?.trim()) {
      query.set('search', params.search.trim());
    }
    if (params?.category && params.category !== 'All') {
      query.set('category', params.category);
    }
    const qs = query.toString();
    return request<KnowledgeEntry[]>(`/api/knowledge${qs ? `?${qs}` : ''}`);
  },

  createKnowledgeEntry(payload: KnowledgeEntryPayload): Promise<KnowledgeEntry> {
    return request<KnowledgeEntry>('/api/knowledge', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateKnowledgeEntry(id: number, payload: KnowledgeEntryPayload): Promise<KnowledgeEntry> {
    return request<KnowledgeEntry>(`/api/knowledge/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteKnowledgeEntry(id: number): Promise<void> {
    return request<void>(`/api/knowledge/${id}`, {
      method: 'DELETE',
    });
  },

  getTickets(status?: TicketStatus | 'All'): Promise<SupportTicket[]> {
    const qs = status && status !== 'All' ? `?status=${encodeURIComponent(status)}` : '';
    return request<SupportTicket[]>(`/api/tickets${qs}`);
  },

  updateTicketStatus(id: number, status: TicketStatus): Promise<SupportTicket> {
    return request<SupportTicket>(`/api/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  getConversations(): Promise<ConversationSummary[]> {
    return request<ConversationSummary[]>('/api/conversations');
  },
};
