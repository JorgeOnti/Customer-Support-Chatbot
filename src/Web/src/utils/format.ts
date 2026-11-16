import type { TicketStatus } from '../types/api';

const SESSION_STORAGE_KEY = 'fork_and_flame_session_id';

export function getOrCreateSessionId(): string {
  const existing = localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing && existing.trim()) {
    return existing;
  }
  return resetSessionId();
}

export function resetSessionId(): string {
  const suffix =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  const newId = `ff-${suffix}-${Date.now().toString(36)}`;
  localStorage.setItem(SESSION_STORAGE_KEY, newId);
  return newId;
}

export function formatUtcTimestamp(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatTimeOnly(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function getTicketStatusMeta(status: TicketStatus): {
  label: string;
  badgeClass: string;
} {
  switch (status) {
    case 'Open':
      return {
        label: 'Open',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
      };
    case 'InProgress':
      return {
        label: 'In Progress',
        badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
      };
    case 'Resolved':
      return {
        label: 'Resolved',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      };
  }
}

export function estimateGpt4oMiniCost(totalTokens: number): string {
  // Blended gpt-4o-mini estimate (~$0.15/1M input + $0.60/1M output, approx $0.25/1M blended)
  const cost = (totalTokens / 1_000_000) * 0.25;
  return `$${cost.toFixed(5)}`;
}
