import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { apiClient, ApiError } from '../api/client';
import { EmptyState, ErrorState, LoadingState } from '../components/StatePanel';
import type { KnowledgeEntry, KnowledgeEntryPayload } from '../types/api';
import { formatUtcTimestamp } from '../utils/format';

const DEFAULT_CATEGORIES = [
  'Hours & Location',
  'Menu & Pricing',
  'Delivery',
  'Dietary & Allergens',
  'Reservations & Policies',
  'Amenities & Services',
];

const emptyForm: KnowledgeEntryPayload = {
  title: '',
  category: 'Menu & Pricing',
  content: '',
  isActive: true,
};

export function KnowledgeBasePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [form, setForm] = useState<KnowledgeEntryPayload>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getKnowledgeEntries();
      setEntries(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load knowledge base entries.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const categories = useMemo(() => {
    const unique = new Set<string>(DEFAULT_CATEGORIES);
    entries.forEach((e) => {
      if (e.category.trim()) {
        unique.add(e.category.trim());
      }
    });
    return ['All', ...Array.from(unique)];
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const term = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (selectedCategory !== 'All' && entry.category !== selectedCategory) {
        return false;
      }
      if (!term) {
        return true;
      }
      return (
        entry.title.toLowerCase().includes(term) ||
        entry.content.toLowerCase().includes(term) ||
        entry.category.toLowerCase().includes(term)
      );
    });
  }, [entries, search, selectedCategory]);

  const openCreateModal = () => {
    setEditingEntry(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (entry: KnowledgeEntry) => {
    setEditingEntry(entry);
    setForm({
      title: entry.title,
      category: entry.category,
      content: entry.content,
      isActive: entry.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.category.trim() || !form.content.trim()) {
      setFormError('Title, Category, and Content are all required.');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const payload: KnowledgeEntryPayload = {
        title: form.title.trim(),
        category: form.category.trim(),
        content: form.content.trim(),
        isActive: form.isActive,
      };

      if (editingEntry) {
        const updated = await apiClient.updateKnowledgeEntry(editingEntry.id, payload);
        setEntries((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await apiClient.createKnowledgeEntry(payload);
        setEntries((prev) => [created, ...prev]);
      }

      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Unable to save entry.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (entry: KnowledgeEntry) => {
    setTogglingId(entry.id);
    try {
      const updated = await apiClient.updateKnowledgeEntry(entry.id, {
        title: entry.title,
        category: entry.category,
        content: entry.content,
        isActive: !entry.isActive,
      });
      setEntries((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update entry status.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    setDeleting(true);
    try {
      await apiClient.deleteKnowledgeEntry(deleteTarget.id);
      setEntries((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete knowledge entry.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-ember-600">
            <BookOpen className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Admin Dashboard</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold text-stone-900 sm:text-3xl">
            Knowledge Base Editor
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Manage authoritative Fork &amp; Flame facts. Active entries are immediately used to
            ground AI customer replies.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-ember-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ember-700"
        >
          <Plus className="h-4 w-4" />
          New Knowledge Entry
        </button>
      </div>

      {/* Filters */}
      <div className="mt-6 space-y-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, category, or answer content..."
            className="w-full rounded-xl border border-stone-300 py-2 pl-10 pr-4 text-sm text-stone-900 placeholder-stone-400 focus:border-ember-500 focus:outline-none focus:ring-2 focus:ring-ember-500/20"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                selectedCategory === cat
                  ? 'bg-charcoal-900 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mt-6">
        {loading ? (
          <LoadingState label="Loading Knowledge Base entries..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void loadEntries()} />
        ) : filteredEntries.length === 0 ? (
          <EmptyState
            title="No knowledge base entries found"
            description={
              search || selectedCategory !== 'All'
                ? 'Try clearing your search filter or choosing a different category.'
                : 'Create your first Fork & Flame knowledge entry to start grounding answers.'
            }
            action={
              search || selectedCategory !== 'All' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setSelectedCategory('All');
                  }}
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-ember-600 px-4 py-2 text-sm font-semibold text-white hover:bg-ember-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Knowledge Entry
                </button>
              )
            }
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="px-5 py-3.5">Title &amp; Answer Preview</th>
                    <th className="px-4 py-3.5">Category</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Updated (UTC)</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-stone-50/70">
                      <td className="max-w-md px-5 py-4">
                        <div className="font-semibold text-stone-900">{entry.title}</div>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-stone-600">
                          {entry.content}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
                          {entry.category}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <button
                          type="button"
                          onClick={() => void handleToggleActive(entry)}
                          disabled={togglingId === entry.id}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                            entry.isActive
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'border-stone-300 bg-stone-100 text-stone-600 hover:bg-stone-200'
                          }`}
                        >
                          {togglingId === entry.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : entry.isActive ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}
                          {entry.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-stone-500">
                        {formatUtcTimestamp(entry.updatedAt)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(entry)}
                            className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-50"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(entry)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h2 className="font-display text-lg font-bold text-stone-900">
                {editingEntry ? 'Edit Knowledge Entry' : 'New Knowledge Entry'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {formError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g., Seasonal Truffle Pairing Menu"
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm focus:border-ember-500 focus:outline-none focus:ring-2 focus:ring-ember-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Category
                </label>
                <input
                  type="text"
                  list="kb-category-suggestions"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="e.g., Menu & Pricing"
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm focus:border-ember-500 focus:outline-none focus:ring-2 focus:ring-ember-500/20"
                  required
                />
                <datalist id="kb-category-suggestions">
                  {DEFAULT_CATEGORIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Factual Answer Content
                </label>
                <textarea
                  rows={5}
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Provide exact facts, prices, hours, or policy details the AI should cite..."
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm focus:border-ember-500 focus:outline-none focus:ring-2 focus:ring-ember-500/20"
                  required
                />
              </div>

              <label className="flex items-center gap-2.5 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-stone-300 text-ember-600 focus:ring-ember-500"
                />
                <span>Active (available immediately to chatbot retrieval)</span>
              </label>

              <div className="flex items-center justify-end gap-2 border-t border-stone-200 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-ember-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-ember-700 disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingEntry ? 'Save Changes' : 'Create Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl animate-fade-in">
            <h2 className="font-display text-lg font-bold text-stone-900">Delete Knowledge Entry?</h2>
            <p className="mt-2 text-sm text-stone-600">
              Are you sure you want to permanently remove{' '}
              <strong className="text-stone-900">{deleteTarget.title}</strong>? The chatbot will no
              longer be able to cite this article.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDelete()}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
