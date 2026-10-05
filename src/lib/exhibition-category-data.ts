'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApplicationField, ApplicationFieldType } from '@/lib/types';
import { supabase } from '@/lib/supabase';

function mapField(row: any): ApplicationField {
  return {
    id: row.id,
    categoryId: row.category_id,
    fieldKey: row.field_key,
    label: row.label,
    fieldType: row.field_type,
    required: Boolean(row.required),
    options: Array.isArray(row.options) ? row.options : [],
    sortOrder: Number(row.sort_order || 0),
    active: Boolean(row.active),
  };
}

export function useApplicationFields(categoryId?: string, includeInactive = false) {
  const [fields, setFields] = useState<ApplicationField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!categoryId) {
      setFields([]);
      setLoading(false);
      return;
    }
    let query = supabase.from('exhibition_application_fields').select('*').eq('category_id', categoryId).order('sort_order');
    if (!includeInactive) query = query.eq('active', true);
    const { data, error: queryError } = await query;
    if (queryError) setError(queryError.message);
    else {
      setError(null);
      setFields((data || []).map(mapField));
    }
    setLoading(false);
  }, [categoryId, includeInactive]);

  useEffect(() => {
    setLoading(true);
    void refresh();
    if (!categoryId) return;
    const channel = supabase.channel(`exhibition-fields-${categoryId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exhibition_application_fields', filter: `category_id=eq.${categoryId}` }, () => void refresh())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [categoryId, refresh]);

  return { fields, loading, error, refresh };
}

export async function saveApplicationField(field: {
  id?: string;
  fieldKey?: string;
  categoryId: string;
  label: string;
  fieldType: ApplicationFieldType;
  required: boolean;
  options: string[];
  sortOrder: number;
}) {
  const label = field.label.trim();
  if (!label) throw new Error('Enter a question label.');
  if (field.fieldType === 'select' && field.options.length < 2) throw new Error('Add at least two dropdown options.');
  const fieldKey = field.fieldKey || label.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60);
  if (fieldKey.length < 2) throw new Error('The question label must contain at least two letters or numbers.');
  const values = {
    category_id: field.categoryId,
    field_key: fieldKey,
    label,
    field_type: field.fieldType,
    required: field.required,
    options: field.fieldType === 'select' ? field.options.map((item) => item.trim()).filter(Boolean) : [],
    sort_order: field.sortOrder,
    active: true,
    updated_at: new Date().toISOString(),
  };
  const result = field.id
    ? await supabase.from('exhibition_application_fields').update(values).eq('id', field.id)
    : await supabase.from('exhibition_application_fields').insert(values);
  if (result.error) throw new Error(result.error.message);
}

export async function deleteApplicationField(id: string) {
  const { error } = await supabase.from('exhibition_application_fields').update({ active: false, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function restoreApplicationField(id: string) {
  const { error } = await supabase.from('exhibition_application_fields').update({ active: true, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function createExhibitionCategory(input: { name: string; description: string; theme: 'peach' | 'green' | 'neutral' }) {
  const name = input.name.trim();
  if (name.length < 2) throw new Error('Enter a category name.');
  const slug = name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (slug.length < 2) throw new Error('The category name must contain at least two letters or numbers.');
  const { data: lastCategory } = await supabase.from('exhibition_categories').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from('exhibition_categories').insert({ slug, name, description: input.description.trim(), theme: input.theme, sort_order: Number(lastCategory?.sort_order || 0) + 1 });
  if (error) throw new Error(error.code === '23505' ? 'A category with this name already exists.' : error.message);
}

export async function updateExhibitionCategory(id: string, input: { name: string; description: string; theme: 'peach' | 'green' | 'neutral'; active: boolean }) {
  const name = input.name.trim();
  if (name.length < 2) throw new Error('Enter a category name.');
  const { error } = await supabase.from('exhibition_categories').update({ name, description: input.description.trim(), theme: input.theme, active: input.active, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
}
