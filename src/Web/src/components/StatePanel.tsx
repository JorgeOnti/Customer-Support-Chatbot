import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Loading data...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-stone-200 bg-white py-16 text-stone-500 shadow-sm">
      <Loader2 className="h-8 w-8 animate-spin text-ember-600" />
      <p className="mt-3 text-sm font-medium">{label}</p>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/70 px-6 py-12 text-center shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-rose-600">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-base font-semibold text-rose-900">Unable to load records</h3>
      <p className="mt-1 max-w-md text-sm text-rose-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-500">
        <Inbox className="h-6 w-6" />
      </div>
      <h3 className="mt-3 text-base font-semibold text-stone-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-stone-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
