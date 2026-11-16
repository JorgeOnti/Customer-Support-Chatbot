import { useCallback, useEffect, useState } from 'react';
import { LifeBuoy, MessageSquare, User, X } from 'lucide-react';
import { apiClient, ApiError } from '../api/client';
import { EmptyState, ErrorState, LoadingState } from '../components/StatePanel';
import { TranscriptView } from '../components/TranscriptView';
import type { SupportTicket, TicketStatus } from '../types/api';
import { formatUtcTimestamp, getTicketStatusMeta } from '../utils/format';

const STATUS_TABS: Array<{ label: string; value: TicketStatus | 'All' }> = [
  { label: 'All', value: 'All' },
  { label: 'Open', value: 'Open' },
  { label: 'In Progress', value: 'InProgress' },
  { label: 'Resolved', value: 'Resolved' },
];

export function SupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'All'>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [activeTranscriptTicket, setActiveTranscriptTicket] = useState<SupportTicket | null>(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getTickets(statusFilter);
      setTickets(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load support tickets.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const handleStatusChange = async (ticketId: number, nextStatus: TicketStatus) => {
    setUpdatingId(ticketId);
    try {
      const updated = await apiClient.updateTicketStatus(ticketId, nextStatus);
      setTickets((prev) => {
        const replaced = prev.map((t) => (t.id === updated.id ? updated : t));
        return statusFilter === 'All'
          ? replaced
          : replaced.filter((t) => t.status === statusFilter);
      });
      if (activeTranscriptTicket?.id === updated.id) {
        setActiveTranscriptTicket(updated);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update ticket status.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-ember-600">
            <LifeBuoy className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Admin Dashboard</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold text-stone-900 sm:text-3xl">
            Support Tickets
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Review escalated customer conversations, inspect full transcripts, and track resolution
            progress.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 rounded-xl border border-stone-200 bg-white p-1.5 shadow-sm">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                statusFilter === tab.value
                  ? 'bg-charcoal-900 text-white shadow-sm'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket List */}
      <div className="mt-6">
        {loading ? (
          <LoadingState label="Loading support tickets..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void loadTickets()} />
        ) : tickets.length === 0 ? (
          <EmptyState
            title="No support tickets found"
            description={
              statusFilter === 'All'
                ? 'Tickets appear here whenever a customer clicks "Talk to a Human" inside the chat widget.'
                : `There are currently no tickets with status "${statusFilter}".`
            }
          />
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => {
              const statusMeta = getTicketStatusMeta(ticket.status);
              return (
                <article
                  key={ticket.id}
                  className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-stone-300"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-sm font-bold text-stone-900">
                          Ticket #{ticket.id}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusMeta.badgeClass}`}
                        >
                          {statusMeta.label}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-stone-500">
                          <User className="h-3.5 w-3.5" />
                          {ticket.customerName || 'Anonymous Guest'}
                        </span>
                        <span className="font-mono text-[11px] text-stone-400">
                          {ticket.sessionId}
                        </span>
                      </div>

                      <p className="text-sm font-medium text-stone-800">{ticket.summary}</p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                        <span>Created {formatUtcTimestamp(ticket.createdAt)}</span>
                        <span>•</span>
                        <span>{ticket.messageCount} messages in transcript</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <select
                        aria-label={`Change status for Ticket #${ticket.id}`}
                        value={ticket.status}
                        disabled={updatingId === ticket.id}
                        onChange={(e) =>
                          void handleStatusChange(ticket.id, e.target.value as TicketStatus)
                        }
                        className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 focus:border-ember-500 focus:outline-none focus:ring-2 focus:ring-ember-500/20 disabled:opacity-60"
                      >
                        <option value="Open">Open</option>
                        <option value="InProgress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => setActiveTranscriptTicket(ticket)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-charcoal-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-charcoal-800"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        View Transcript
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Transcript Slide-Over Drawer */}
      {activeTranscriptTicket && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex h-full w-full max-w-xl flex-col bg-stone-50 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-bold text-stone-900">
                    Ticket #{activeTranscriptTicket.id} Transcript
                  </h2>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                      getTicketStatusMeta(activeTranscriptTicket.status).badgeClass
                    }`}
                  >
                    {getTicketStatusMeta(activeTranscriptTicket.status).label}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-stone-500">
                  {activeTranscriptTicket.customerName || 'Anonymous Guest'} • Session{' '}
                  <span className="font-mono">{activeTranscriptTicket.sessionId}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTranscriptTicket(null)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
                <strong>Escalation Summary:</strong> {activeTranscriptTicket.summary}
              </div>

              <TranscriptView messages={activeTranscriptTicket.messages} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
