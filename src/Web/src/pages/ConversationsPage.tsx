import { useCallback, useEffect, useState } from 'react';
import { Cpu, LifeBuoy, MessageSquareText, User } from 'lucide-react';
import { apiClient, ApiError } from '../api/client';
import { EmptyState, ErrorState, LoadingState } from '../components/StatePanel';
import { TranscriptView } from '../components/TranscriptView';
import type { ConversationSummary } from '../types/api';
import {
  estimateGpt4oMiniCost,
  formatUtcTimestamp,
  getTicketStatusMeta,
} from '../utils/format';

export function ConversationsPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getConversations();
      setConversations(data);
      setSelectedId((prev) =>
        prev && data.some((c) => c.id === prev) ? prev : data[0]?.id ?? null
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load conversation logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const selectedConversation =
    conversations.find((c) => c.id === selectedId) ?? conversations[0] ?? null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-ember-600">
          <MessageSquareText className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-wider">Admin Dashboard</span>
        </div>
        <h1 className="mt-1 font-display text-2xl font-bold text-stone-900 sm:text-3xl">
          Conversation Logs
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Audit customer chat sessions, verified Knowledge Base citations, and per-turn OpenAI token
          usage.
        </p>
      </div>

      {/* Master-Detail Workspace */}
      <div className="mt-6">
        {loading ? (
          <LoadingState label="Loading conversation transcripts..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void loadConversations()} />
        ) : conversations.length === 0 ? (
          <EmptyState
            title="No customer conversations yet"
            description="Start a conversation in the Storefront chat widget to see transcripts, cited sources, and token metrics appear here."
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Master List */}
            <aside className="space-y-2.5 lg:col-span-4">
              {conversations.map((conv) => {
                const isSelected = selectedConversation?.id === conv.id;
                const ticketMeta = conv.latestTicketStatus
                  ? getTicketStatusMeta(conv.latestTicketStatus)
                  : null;

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setSelectedId(conv.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? 'border-ember-500 bg-ember-50/60 shadow-sm ring-1 ring-ember-500/30'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
                          <User className="h-3.5 w-3.5 shrink-0 text-stone-500" />
                          <span className="truncate">
                            {conv.customerName || 'Anonymous Guest'}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-stone-500">
                          {conv.sessionId}
                        </p>
                      </div>

                      {conv.hasTicket && ticketMeta && (
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ticketMeta.badgeClass}`}
                        >
                          <LifeBuoy className="h-3 w-3" />
                          #{conv.latestTicketId} {ticketMeta.label}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200/70 pt-2.5 text-[11px] text-stone-600">
                      <span>{conv.messageCount} messages</span>
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Cpu className="h-3 w-3 text-stone-400" />
                        {conv.totalTokensUsed} tokens
                      </span>
                      <span>{formatUtcTimestamp(conv.lastActivityAt)}</span>
                    </div>
                  </button>
                );
              })}
            </aside>

            {/* Right Detail Transcript */}
            <section className="rounded-2xl border border-stone-200 bg-stone-50 p-6 shadow-sm lg:col-span-8">
              {selectedConversation ? (
                <>
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
                    <div>
                      <h2 className="font-display text-lg font-bold text-stone-900">
                        {selectedConversation.customerName || 'Anonymous Guest'}
                      </h2>
                      <p className="mt-0.5 font-mono text-xs text-stone-500">
                        Session: {selectedConversation.sessionId} • Started{' '}
                        {formatUtcTimestamp(selectedConversation.startedAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 font-medium text-stone-700">
                        {selectedConversation.messageCount} turns
                      </span>
                      <span className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 font-mono text-stone-700">
                        {selectedConversation.totalTokensUsed} tokens (~
                        {estimateGpt4oMiniCost(selectedConversation.totalTokensUsed)})
                      </span>
                    </div>
                  </div>

                  <TranscriptView messages={selectedConversation.messages} />
                </>
              ) : null}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
