import { BookCheck, Bot, Cpu, User } from 'lucide-react';
import type { ChatMessageItem } from '../types/api';
import { formatUtcTimestamp } from '../utils/format';

interface TranscriptViewProps {
  messages: ChatMessageItem[];
  emptyMessage?: string;
}

export function TranscriptView({
  messages,
  emptyMessage = 'No messages recorded in this session yet.',
}: TranscriptViewProps) {
  if (messages.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center text-sm text-stone-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((msg) => {
        const isUser = msg.role === 'User';
        return (
          <div
            key={msg.id}
            className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                isUser
                  ? 'bg-charcoal-900 text-white'
                  : 'bg-ember-100 text-ember-700 border border-ember-200'
              }`}
            >
              {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>

            <div className={`max-w-[82%] space-y-1.5 ${isUser ? 'items-end text-right' : ''}`}>
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                  isUser
                    ? 'bg-charcoal-900 text-white rounded-tr-sm text-left'
                    : 'bg-white border border-stone-200 text-stone-800 rounded-tl-sm text-left'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>

              <div
                className={`flex flex-wrap items-center gap-2 text-[11px] text-stone-500 ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                <span>{isUser ? 'Customer' : 'Assistant'}</span>
                <span>•</span>
                <span>{formatUtcTimestamp(msg.createdAt)}</span>
                {!isUser && typeof msg.tokensUsed === 'number' && msg.tokensUsed > 0 && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] text-stone-600">
                      <Cpu className="h-3 w-3" />
                      {msg.tokensUsed} tokens
                    </span>
                  </>
                )}
              </div>

              {!isUser && msg.sources.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {msg.sources.map((src, idx) => (
                    <span
                      key={`${msg.id}-${src.id}-${idx}`}
                      className="inline-flex items-center gap-1 rounded-full border border-ember-200 bg-ember-50 px-2.5 py-0.5 text-[11px] font-medium text-ember-800"
                    >
                      <BookCheck className="h-3 w-3 text-ember-600" />
                      {src.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
