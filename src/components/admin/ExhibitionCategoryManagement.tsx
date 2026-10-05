'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Archive, Plus, Save, Trash2 } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { useExhibitionCategory } from '@/lib/exhibition-category';
import { ApplicationField, ApplicationFieldType } from '@/lib/types';
import { createExhibitionCategory, deleteApplicationField, restoreApplicationField, saveApplicationField, updateExhibitionCategory, useApplicationFields } from '@/lib/exhibition-category-data';

const fieldTypes: { value: ApplicationFieldType; label: string }[] = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
];

const blankField = { label: '', fieldType: 'text' as ApplicationFieldType, required: false, optionsText: '' };

export function ExhibitionCategoryManagement() {
  const { categories, activeCategory, setActiveCategory, refreshCategories } = useExhibitionCategory();
  const { fields, loading, error: fieldsError, refresh: refreshFields } = useApplicationFields(activeCategory?.id, true);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState({ name: '', description: '', theme: 'neutral' as 'peach' | 'green' | 'neutral' });
  const [categoryEditing, setCategoryEditing] = useState(false);
  const [fieldDraft, setFieldDraft] = useState(blankField);
  const [editingField, setEditingField] = useState<ApplicationField | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCategory || categoryEditing) return;
    setCategoryDraft({ name: activeCategory.name, description: activeCategory.description, theme: activeCategory.theme });
  }, [activeCategory, categoryEditing]);

  const handleCreateCategory = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(null); setNotice(null);
    try {
      await createExhibitionCategory(categoryDraft);
      await refreshCategories();
      setCategoryFormOpen(false);
      setCategoryDraft({ name: '', description: '', theme: 'neutral' });
      setNotice('Category added. Select it in the category switch to set up its tiers and application questions.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not add the category.'); }
    finally { setSaving(false); }
  };

  const handleSaveCategory = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeCategory) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      await updateExhibitionCategory(activeCategory.id, { ...categoryDraft, active: activeCategory.active });
      await refreshCategories();
      setCategoryEditing(false);
      setNotice('Category details saved.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save category details.'); }
    finally { setSaving(false); }
  };

  const handleArchive = async () => {
    if (!activeCategory || !activeCategory.active) return;
    if (!confirm(`Archive “${activeCategory.name}”? New applications will stop, while existing permits and records are preserved.`)) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      await updateExhibitionCategory(activeCategory.id, { name: activeCategory.name, description: activeCategory.description, theme: activeCategory.theme, active: false });
      await refreshCategories();
      setNotice('Category archived. Existing applications and permits remain available in admin.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not archive the category.'); }
    finally { setSaving(false); }
  };

  const handleSaveField = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeCategory) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      await saveApplicationField({
        id: editingField?.id,
        fieldKey: editingField?.fieldKey,
        categoryId: activeCategory.id,
        label: fieldDraft.label,
        fieldType: fieldDraft.fieldType,
        required: fieldDraft.required,
        options: fieldDraft.optionsText.split('\n').map((option) => option.trim()).filter(Boolean),
        sortOrder: editingField?.sortOrder ?? fields.length,
      });
      setFieldDraft(blankField); setEditingField(null); await refreshFields(); setNotice('Application question saved.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save the question.'); }
    finally { setSaving(false); }
  };

  const startEditField = (field: ApplicationField) => {
    setEditingField(field);
    setFieldDraft({ label: field.label, fieldType: field.fieldType, required: field.required, optionsText: field.options.join('\n') });
  };

  const handleDeleteField = async (field: ApplicationField) => {
    if (!confirm(`Remove the “${field.label}” question? Existing application answers are retained.`)) return;
    setError(null);
    try { await deleteApplicationField(field.id); await refreshFields(); setNotice('Question removed; previously submitted answers remain on existing permits.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not remove the question.'); }
  };

  return (
    <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Exhibition setup</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">Categories & Application Questions</h2>
          <p className="mt-1 text-sm text-slate-600">Create exhibitor sections, choose one in the header switch, and configure its questions.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setCategoryDraft({ name: '', description: '', theme: 'neutral' }); setCategoryFormOpen((open) => !open); setError(null); }}>
          <Plus className="mr-1.5 h-4 w-4" /> Add Category
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}
      {fieldsError && <Alert variant="error">{fieldsError}</Alert>}

      {categoryFormOpen && (
        <form onSubmit={handleCreateCategory} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
          <label className="text-xs font-semibold text-slate-600">Category name<input required maxLength={100} value={categoryDraft.name} onChange={(e) => setCategoryDraft((draft) => ({ ...draft, name: e.target.value }))} className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm" /></label>
          <label className="text-xs font-semibold text-slate-600 md:col-span-2">Summary<input maxLength={500} value={categoryDraft.description} onChange={(e) => setCategoryDraft((draft) => ({ ...draft, description: e.target.value }))} className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm" /></label>
          <label className="text-xs font-semibold text-slate-600">Theme<select value={categoryDraft.theme} onChange={(e) => setCategoryDraft((draft) => ({ ...draft, theme: e.target.value as typeof draft.theme }))} className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm"><option value="peach">Peach</option><option value="green">Pastel green</option><option value="neutral">Neutral</option></select></label>
          <div className="flex gap-2 md:col-span-4"><Button type="submit" disabled={saving}>Create Category</Button><Button type="button" variant="outline" onClick={() => setCategoryFormOpen(false)}>Cancel</Button></div>
        </form>
      )}

      {activeCategory ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div><h3 className="font-semibold text-slate-900">Selected category</h3><p className="text-xs text-slate-500">Switch categories in the site header to update tiers and reservations.</p></div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${activeCategory.active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{activeCategory.active ? 'Accepting applications' : 'Archived'}</span>
              </div>
              <form onSubmit={handleSaveCategory} className="space-y-3">
                <label className="block text-xs font-semibold text-slate-600">Name<input required maxLength={100} value={categoryDraft.name} onChange={(e) => setCategoryDraft((draft) => ({ ...draft, name: e.target.value }))} onFocus={() => setCategoryEditing(true)} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" /></label>
                <label className="block text-xs font-semibold text-slate-600">Description<input maxLength={500} value={categoryDraft.description} onChange={(e) => setCategoryDraft((draft) => ({ ...draft, description: e.target.value }))} onFocus={() => setCategoryEditing(true)} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" /></label>
                <label className="block text-xs font-semibold text-slate-600">Theme<select value={categoryDraft.theme} onChange={(e) => { setCategoryEditing(true); setCategoryDraft((draft) => ({ ...draft, theme: e.target.value as typeof draft.theme })); }} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm"><option value="peach">Peach</option><option value="green">Pastel green</option><option value="neutral">Neutral</option></select></label>
                <div className="flex flex-wrap gap-2"><Button type="submit" size="sm" disabled={saving}><Save className="mr-1.5 h-4 w-4" /> Save Details</Button>{activeCategory.active ? <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => void handleArchive()}><Archive className="mr-1.5 h-4 w-4" /> Archive</Button> : <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => void updateExhibitionCategory(activeCategory.id, { ...categoryDraft, active: true }).then(refreshCategories)}><Archive className="mr-1.5 h-4 w-4" /> Restore</Button>}</div>
              </form>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900">Application questions</h3>
              <p className="mb-3 text-xs text-slate-500">These questions appear after the shared organization and contact details.</p>
              {loading ? <p className="text-sm text-slate-500">Loading questions…</p> : fields.length ? <div className="mb-4 space-y-2">{fields.map((field) => <div key={field.id} className={`flex items-start justify-between gap-3 rounded border p-3 ${field.active ? 'border-slate-100 bg-slate-50' : 'border-slate-200 bg-slate-100 opacity-70'}`}><div><p className="text-sm font-medium text-slate-900">{field.label}{field.required && <span className="ml-1 text-rose-600">*</span>}{!field.active && <span className="ml-2 text-[10px] font-bold uppercase text-slate-500">Archived</span>}</p><p className="text-xs text-slate-500">{fieldTypes.find((type) => type.value === field.fieldType)?.label}{field.fieldType === 'select' ? ` · ${field.options.join(', ')}` : ''}</p></div><div className="flex gap-1">{field.active ? <><Button variant="outline" size="sm" onClick={() => startEditField(field)}>Edit</Button><Button variant="outline" size="sm" onClick={() => void handleDeleteField(field)} aria-label={`Remove ${field.label}`}><Trash2 className="h-3.5 w-3.5 text-rose-700" /></Button></> : <Button variant="outline" size="sm" onClick={() => void restoreApplicationField(field.id).then(refreshFields)}>Restore</Button>}</div></div>)}</div> : <p className="mb-4 rounded bg-slate-50 p-3 text-sm text-slate-500">No extra questions configured for this category.</p>}
              <form onSubmit={handleSaveField} className="space-y-3 border-t border-slate-100 pt-4">
                <h4 className="text-sm font-semibold text-slate-800">{editingField ? 'Edit question' : 'Add a question'}</h4>
                <label className="block text-xs font-semibold text-slate-600">Question label<input required maxLength={120} value={fieldDraft.label} onChange={(e) => setFieldDraft((draft) => ({ ...draft, label: e.target.value }))} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" /></label>
                <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-semibold text-slate-600">Answer type<select value={fieldDraft.fieldType} onChange={(e) => setFieldDraft((draft) => ({ ...draft, fieldType: e.target.value as ApplicationFieldType }))} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm">{fieldTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label><label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700"><input type="checkbox" checked={fieldDraft.required} onChange={(e) => setFieldDraft((draft) => ({ ...draft, required: e.target.checked }))} /> Required question</label></div>
                {fieldDraft.fieldType === 'select' && <label className="block text-xs font-semibold text-slate-600">Dropdown choices (one per line)<textarea required rows={3} value={fieldDraft.optionsText} onChange={(e) => setFieldDraft((draft) => ({ ...draft, optionsText: e.target.value }))} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" placeholder={'Cattle\nGoats\nSheep'} /></label>}
                <div className="flex gap-2"><Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving…' : editingField ? 'Save Question' : 'Add Question'}</Button>{editingField && <Button type="button" size="sm" variant="outline" onClick={() => { setEditingField(null); setFieldDraft(blankField); }}>Cancel</Button>}</div>
              </form>
            </div>
          </div>
          <p className="text-xs text-slate-500">All categories ({categories.length}): {categories.map((category) => <button key={category.id} type="button" onClick={() => { setActiveCategory(category.id); setCategoryEditing(false); }} className={`mr-2 underline ${category.id === activeCategory.id ? 'font-bold text-slate-900' : 'text-slate-600'}`}>{category.name}{category.active ? '' : ' (archived)'}</button>)}</p>
        </>
      ) : <p className="text-sm text-slate-500">Categories are loading…</p>}
    </section>
  );
}
