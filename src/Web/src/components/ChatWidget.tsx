import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookCheck,
  Bot,
  CheckCircle2,
  Flame,
  Headphones,
  Loader2,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Send,
  User,
  X,
} from 'lucide-react';
import { apiClient, ApiError } from '../api/client';
import type { ChatMessageItem, SupportTicket } from '../types/api';
import { formatTimeOnly, getOrCreateSessionId, resetSessionId } from '../utils/format';

interface ChatWidgetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  queuedPrompt: { id: number; text: string } | null;
  onQueuedPromptConsumed: () => void;
}

export function ChatWidget({
  isOpen,
  onOpenChange,
  queuedPrompt,
  onQueuedPromptConsumed,
}: ChatWidgetProps) {
  const [sessionId, setSessionId] = useState<string>(() => getOrCreateSessionId());
  const [customerName, setCustomerName] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [offerHandoff, setOfferHandoff] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [escalating, setEscalating] = useState<boolean>(false);
  const [input, setInput] = useState<string>('');
  const [errorState, setErrorState] = useState<{ message: string; retryPrompt?: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const handledPromptIdRef = useRef<number | null>(null);

  const loadSessionHistory = useCallback(async (targetSessionId: string) => {
    setLoadingHistory(true);
    setErrorState(null);
    try {
      const session = await apiClient.getChatHistory(targetSessionId);
      setMessages(session.messages);
      setActiveTicket(session.activeTicket ?? null);
      if (session.customerName) {
        setCustomerName(session.customerName);
      }
      setOfferHandoff(false);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Failed to load your previous chat session.';
      setErrorState({ message });
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    void loadSessionHistory(sessionId);
  }, [sessionId, loadSessionHistory]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, sending, offerHandoff, isOpen]);

  const sendMessage = useCallback(
    async (rawText: string) => {
      const trimmed = rawText.trim();
      if (!trimmed || sending) {
        return;
      }

      setErrorState(null);
      setSending(true);

      const optimisticUserId = -Date.now();
      const optimisticUserMsg: ChatMessageItem = {
        id: optimisticUserId,
        role: 'User',
        content: trimmed,
        createdAt: new Date().toISOString(),
        sources: [],
      };

      setMessages((prev) => [...prev, optimisticUserMsg]);
      setInput('');

      try {
        const res = await apiClient.sendChatMessage({
          sessionId,
          message: trimmed,
          customerName: customerName.trim() || undefined,
        });

        const assistantMsg: ChatMessageItem = {
          id: Date.now(),
          role: 'Assistant',
          content: res.reply,
          createdAt: res.createdAt,
          tokensUsed: res.tokensUsed,
          sources: res.sources,
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setOfferHandoff(res.offerHandoff);
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticUserId));
        const message =
          err instanceof ApiError
            ? err.message
            : 'Something went wrong while contacting Fork & Flame support.';
        setErrorState({ message, retryPrompt: trimmed });
      } finally {
        setSending(false);
      }
    },
    [customerName, sending, sessionId]
  );

  useEffect(() => {
    if (!queuedPrompt || queuedPrompt.id === handledPromptIdRef.current) {
      return;
    }

    if (loadingHistory || sending) {
      return;
    }

    handledPromptIdRef.current = queuedPrompt.id;
    onOpenChange(true);
    void sendMessage(queuedPrompt.text);
    onQueuedPromptConsumed();
  }, [
    queuedPrompt,
    loadingHistory,
    sending,
    onOpenChange,
    sendMessage,
    onQueuedPromptConsumed,
  ]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const handleEscalate = async () => {
    if (escalating) {
      return;
    }
    setEscalating(true);
    setErrorState(null);

    try {
      const res = await apiClient.escalateChat(sessionId, {
        customerName: customerName.trim() || undefined,
      });
      setActiveTicket(res.ticket);
      setOfferHandoff(false);
      setMessages((prev) => [...prev, res.confirmationMessage]);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Unable to create support ticket right now.';
      setErrorState({ message });
    } finally {
      setEscalating(false);
    }
  };

  const handleResetSession = () => {
    const freshId = resetSessionId();
    setSessionId(freshId);
    setMessages([]);
    setActiveTicket(null);
    setOfferHandoff(false);
    setErrorState(null);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {isOpen && (
        <section
          aria-label="Fork & Flame AI Support Chat"
          className="mb-3 flex h-[560px] w-[calc(100vw-2.5rem)] max-w-[400px] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl animate-fade-in"
        >
          {/* Widget Header */}
          <div className="bg-charcoal-900 px-4 py-3.5 text-white">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ember-600 text-white shadow">
                  <Flame className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold leading-tight">Fork &amp; Flame Concierge</h2>
                  <p className="text-[11px] text-stone-300">
                    Grounded in our live restaurant Knowledge Base
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleResetSession}
                  title="Start a new chat session"
                  className="rounded-lg p-1.5 text-stone-300 transition hover:bg-charcoal-700 hover:text-white"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  aria-label="Minimize chat widget"
                  className="rounded-lg p-1.5 text-stone-300 transition hover:bg-charcoal-700 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/10 pt-2.5">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Your name (optional)"
                aria-label="Customer name (optional)"
                className="w-40 rounded-lg border border-white/15 bg-charcoal-800 px-2.5 py-1 text-xs text-white placeholder-stone-400 focus:border-ember-400 focus:outline-none"
              />

              <button
                type="button"
                onClick={() => void handleEscalate()}
                disabled={escalating}
                className="inline-flex items-center gap-1.5 rounded-lg bg-ember-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-ember-500 disabled:opacity-60"
              >
                {escalating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Headphones className="h-3.5 w-3.5" />
                )}
                Talk to a Human
              </button>
            </div>
          </div>

          {/* Active Ticket Banner */}
          {activeTicket && (
            <div className="flex items-center justify-between border-b border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs text-emerald-900">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Support Ticket #{activeTicket.id} active ({activeTicket.status})
              </span>
              <span className="font-mono text-[10px] text-emerald-700">Transcript saved</span>
            </div>
          )}

          {/* Error Banner */}
          {errorState && (
            <div className="flex items-start justify-between gap-2 border-b border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <span>{errorState.message}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (errorState.retryPrompt) {
                    void sendMessage(errorState.retryPrompt);
                  } else {
                    void loadSessionHistory(sessionId);
                  }
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded bg-rose-600 px-2 py-1 font-semibold text-white hover:bg-rose-700"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            </div>
          )}

          {/* Messages Feed */}
          <div className="flex-1 space-y-3.5 overflow-y-auto bg-stone-50 p-4">
            {loadingHistory ? (
              <div className="flex h-full flex-col items-center justify-center text-stone-400">
                <Loader2 className="h-6 w-6 animate-spin text-ember-600" />
                <p className="mt-2 text-xs">Loading conversation...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700 shadow-sm">
                <div className="flex items-center gap-2 font-semibold text-stone-900">
                  <Bot className="h-4 w-4 text-ember-600" />
                  Welcome to Fork &amp; Flame!
                </div>
                <p className="text-xs leading-relaxed text-stone-600">
                  Ask me about our wood-fired menu &amp; prices, opening hours, delivery radius,
                  allergens, reservations, or catering. Every answer comes strictly from our
                  restaurant Knowledge Base.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'User';
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        isUser
                          ? 'bg-charcoal-900 text-white'
                          : 'border border-ember-200 bg-ember-100 text-ember-700'
                      }`}
                    >
                      {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                    </div>

                    <div className={`max-w-[82%] space-y-1 ${isUser ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-sm ${
                          isUser
                            ? 'rounded-tr-sm bg-charcoal-900 text-white'
                            : 'rounded-tl-sm border border-stone-200 bg-white text-stone-800'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>

                      {!isUser && msg.sources.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {msg.sources.map((src, idx) => (
                            <span
                              key={`${msg.id}-${src.id}-${idx}`}
                              className="inline-flex items-center gap-1 rounded-full border border-ember-200 bg-ember-50 px-2 py-0.5 text-[10px] font-medium text-ember-800"
                            >
                              <BookCheck className="h-2.5 w-2.5 text-ember-600" />
                              {src.title}
                            </span>
                          ))}
                        </div>
                      )}

                      <p
                        className={`text-[10px] text-stone-400 ${
                          isUser ? 'text-right' : 'text-left'
                        }`}
                      >
                        {formatTimeOnly(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing Indicator */}
            {sending && (
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-ember-200 bg-ember-100 text-ember-700">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-stone-200 bg-white px-3.5 py-2.5 shadow-sm">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ember-500 [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ember-500 [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ember-500" />
                </div>
              </div>
            )}

            {/* Highlighted Human Handoff Prompt */}
            {offerHandoff && !sending && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 shadow-sm">
                <p className="text-xs font-medium text-amber-900">
                  Need personal assistance from our team?
                </p>
                <p className="mt-0.5 text-[11px] text-amber-800">
                  Create a support ticket and send this chat transcript directly to Fork &amp; Flame
                  staff.
                </p>
                <button
                  type="button"
                  onClick={() => void handleEscalate()}
                  disabled={escalating}
                  className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-ember-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-ember-700 disabled:opacity-60"
                >
                  {escalating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Headphones className="h-3.5 w-3.5" />
                  )}
                  Talk to a Human — Create Support Ticket
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={handleFormSubmit}
            className="flex items-center gap-2 border-t border-stone-200 bg-white p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about hours, menu, delivery..."
              disabled={sending}
              className="flex-1 rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 placeholder-stone-400 focus:border-ember-500 focus:outline-none focus:ring-2 focus:ring-ember-500/20 disabled:bg-stone-100"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              aria-label="Send message"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ember-600 text-white shadow-sm transition hover:bg-ember-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      )}

      {/* Floating Toggle Bubble */}
      <button
        type="button"
        onClick={() => onOpenChange(!isOpen)}
        aria-label={isOpen ? 'Close Fork & Flame chat widget' : 'Open Fork & Flame chat widget'}
        className="group flex items-center gap-2.5 rounded-full bg-ember-600 px-5 py-3.5 text-sm font-semibold text-white shadow-xl transition-all hover:scale-105 hover:bg-ember-700 focus:outline-none focus:ring-4 focus:ring-ember-500/30"
      >
        {isOpen ? (
          <>
            <X className="h-5 w-5" />
            <span>Close Support</span>
          </>
        ) : (
          <>
            <MessageCircle className="h-5 w-5" />
            <span>Ask Fork &amp; Flame</span>
          </>
        )}
      </button>
    </div>
  );
}
