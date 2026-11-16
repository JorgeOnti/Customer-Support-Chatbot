import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BookOpen,
  Flame,
  LifeBuoy,
  MessageSquareText,
  Sparkles,
  Store,
} from 'lucide-react';
import { apiClient } from '../api/client';
import type { HealthStatus } from '../types/api';

const navItems = [
  { to: '/', label: 'Storefront Demo', icon: Store, end: true },
  { to: '/admin/knowledge', label: 'Knowledge Base', icon: BookOpen, end: false },
  { to: '/admin/tickets', label: 'Support Tickets', icon: LifeBuoy, end: false },
  { to: '/admin/conversations', label: 'Conversations', icon: MessageSquareText, end: false },
];

export function Navbar() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthError, setHealthError] = useState(false);

  useEffect(() => {
    let active = true;
    apiClient
      .getHealth()
      .then((res) => {
        if (active) {
          setHealth(res);
          setHealthError(false);
        }
      })
      .catch(() => {
        if (active) {
          setHealthError(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-charcoal-900 text-stone-100 shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <NavLink to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ember-600 text-white shadow-md transition-transform group-hover:scale-105">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <span className="font-display text-lg font-bold tracking-tight text-white">
              Fork &amp; Flame
            </span>
            <span className="ml-2 hidden rounded-full bg-charcoal-700 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-ember-300 sm:inline-block">
              AI Support Suite
            </span>
          </div>
        </NavLink>

        <nav className="flex flex-wrap items-center gap-1 sm:gap-1.5" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-ember-600 text-white shadow-sm'
                      : 'text-stone-300 hover:bg-charcoal-800 hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {healthError ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-200">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              API Offline
            </span>
          ) : health ? (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                health.openAiConfigured
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
              }`}
              title={
                health.openAiConfigured
                  ? 'Connected to ASP.NET Core API & OpenAI gpt-4o-mini'
                  : 'API online — configure OPENAI_API_KEY in src/Api to enable AI replies'
              }
            >
              <Sparkles className="h-3.5 w-3.5" />
              {health.openAiConfigured ? 'AI Ready (gpt-4o-mini)' : 'API Online • Key Needed'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-700 bg-charcoal-800 px-2.5 py-1 text-xs text-stone-400">
              Checking API...
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
