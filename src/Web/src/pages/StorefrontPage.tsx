import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Clock,
  Flame,
  MapPin,
  ShieldCheck,
  Sparkles,
  Truck,
  UtensilsCrossed,
} from 'lucide-react';
import { ChatWidget } from '../components/ChatWidget';

const SAMPLE_PROMPTS = [
  {
    label: 'What are your hours?',
    tag: 'Grounded KB',
  },
  {
    label: 'Do you deliver 8 miles away?',
    tag: 'Policy Check',
  },
  {
    label: 'What gluten-free options do you have?',
    tag: 'Dietary & Allergens',
  },
  {
    label: 'How much is a private chef tasting menu?',
    tag: 'Out-of-Scope Test',
  },
  {
    label: 'What signature steaks and cocktails do you serve?',
    tag: 'Menu & Pricing',
  },
  {
    label: 'What is your group reservation cancellation policy?',
    tag: 'Reservations',
  },
];

const MENU_HIGHLIGHTS = [
  {
    name: '14 oz Wood-Fired Ribeye',
    price: '$34.00',
    description: 'Oak-grilled prime ribeye with roasted bone marrow butter and one house side.',
  },
  {
    name: 'Truffle Burrata & Grilled Sourdough',
    price: '$14.50',
    description: 'Creamy burrata, blistered heirloom tomatoes, aged balsamic, and charred flatbread.',
  },
  {
    name: 'Hot Honey Pepperoni Pizza',
    price: '$18.50',
    description: 'Naturally leavened sourdough crust, crispy cup pepperoni, wildflower chili honey.',
  },
  {
    name: 'Smoked Old Fashioned',
    price: '$15.00',
    description: 'Small-batch bourbon, demerara, orange bitters, torched pecan wood smoke.',
  },
];

export function StorefrontPage() {
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [queuedPrompt, setQueuedPrompt] = useState<{ id: number; text: string } | null>(null);

  const handleSamplePrompt = (text: string) => {
    setWidgetOpen(true);
    setQueuedPrompt({ id: Date.now(), text });
  };

  return (
    <div className="pb-24">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-charcoal-900 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(245,93,36,0.28),_transparent_55%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-ember-500/40 bg-ember-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-ember-300">
                <Flame className="h-3.5 w-3.5" />
                Live AI Support Widget Demo
              </div>
              <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Wood-Fired Dining, Backed by Grounded AI Concierge Support.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-300 sm:text-lg">
                Welcome to <strong className="text-white">Fork &amp; Flame</strong> in downtown
                Austin. Test the embeddable customer support widget in the bottom-right corner—every
                reply is strictly grounded in our live Knowledge Base with zero hallucinated prices
                or policies and seamless human ticket escalation.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setWidgetOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-ember-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-ember-500"
                >
                  <Sparkles className="h-4 w-4" />
                  Launch Chat Widget
                </button>
                <Link
                  to="/admin/knowledge"
                  className="inline-flex items-center gap-2 rounded-xl border border-stone-700 bg-charcoal-800 px-5 py-3 text-sm font-semibold text-stone-200 transition hover:border-stone-500 hover:text-white"
                >
                  Open Admin Knowledge Base
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Sample Prompt Chips Card */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-white/10 bg-charcoal-800/90 p-6 shadow-2xl backdrop-blur">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-ember-300">
                    Try Instant Test Prompts
                  </h2>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] text-stone-300">
                    Click to ask
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-stone-400">
                  Includes grounded menu/policy queries plus an out-of-scope prompt to verify
                  anti-hallucination guardrails.
                </p>

                <div className="mt-4 space-y-2">
                  {SAMPLE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt.label}
                      type="button"
                      onClick={() => handleSamplePrompt(prompt.label)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-charcoal-900/80 px-3.5 py-2.5 text-left text-sm text-stone-100 transition hover:border-ember-500/60 hover:bg-charcoal-900"
                    >
                      <span className="font-medium">&ldquo;{prompt.label}&rdquo;</span>
                      <span className="shrink-0 rounded-full bg-ember-500/15 px-2 py-0.5 text-[10px] font-semibold text-ember-300">
                        {prompt.tag}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Info Cards */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ember-50 text-ember-600">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-stone-900">Hours &amp; Brunch</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
              Mon–Thu 11:30 AM–10:00 PM • Fri–Sat 11:30 AM–11:30 PM • Sunday 10:00 AM–9:00 PM
              (Brunch until 2:30 PM).
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ember-50 text-ember-600">
              <Truck className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-stone-900">Local Delivery &amp; Pickup</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
              Direct delivery within 5 miles ($20.00 min, $4.99 fee, 35–50 min ETA). Free curbside
              pickup on 8th Street with zero minimum.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ember-50 text-ember-600">
              <MapPin className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-stone-900">Downtown Austin</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
              742 Ember Way, Suite 100, Austin, TX 78701. Validated Ember Plaza Garage parking &amp;
              dog-friendly heated patio.
            </p>
          </div>
        </div>
      </section>

      {/* Menu Highlights & Architecture Callout */}
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm lg:col-span-7">
            <div className="flex items-center gap-2 text-ember-600">
              <UtensilsCrossed className="h-5 w-5" />
              <h2 className="font-display text-xl font-bold text-stone-900">
                Wood-Fired Menu Highlights
              </h2>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {MENU_HIGHLIGHTS.map((item) => (
                <div
                  key={item.name}
                  className="rounded-xl border border-stone-200 bg-stone-50/80 p-4"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold text-stone-900">{item.name}</h3>
                    <span className="font-mono text-sm font-bold text-ember-700">
                      {item.price}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-ember-200 bg-ember-50/70 p-6 lg:col-span-5">
            <div>
              <div className="flex items-center gap-2 text-ember-700">
                <ShieldCheck className="h-5 w-5" />
                <h2 className="font-display text-xl font-bold text-stone-900">
                  Built for Zero Hallucinations
                </h2>
              </div>
              <ul className="mt-4 space-y-2.5 text-sm text-stone-700">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ember-600" />
                  <span>
                    <strong>Top-K Retrieval:</strong> Scores active KB articles and short-circuits
                    when no article matches above threshold.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ember-600" />
                  <span>
                    <strong>Verified Source Badges:</strong> Server validates every cited title
                    against retrieved KB entries.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ember-600" />
                  <span>
                    <strong>Instant Staff Handoff:</strong> Escalates unresolved sessions into
                    Support Tickets with full transcripts.
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                to="/admin/tickets"
                className="rounded-lg bg-charcoal-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-charcoal-800"
              >
                View Support Tickets
              </Link>
              <Link
                to="/admin/conversations"
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 transition hover:bg-stone-100"
              >
                Inspect Conversation Logs
              </Link>
            </div>
          </div>
        </div>
      </section>

      <ChatWidget
        isOpen={widgetOpen}
        onOpenChange={setWidgetOpen}
        queuedPrompt={queuedPrompt}
        onQueuedPromptConsumed={() => setQueuedPrompt(null)}
      />
    </div>
  );
}
