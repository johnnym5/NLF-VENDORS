'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { ExhibitionCategory } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface ExhibitionCategoryContextValue {
  categories: ExhibitionCategory[];
  activeCategory: ExhibitionCategory | null;
  loading: boolean;
  setActiveCategory: (id: string) => void;
  refreshCategories: () => Promise<void>;
}

const Context = createContext<ExhibitionCategoryContextValue | null>(null);
const STORAGE_KEY = 'nlf-active-exhibition-category';
const DEFAULT_SLUG = 'food-commercial-vendors';

function mapCategory(row: any): ExhibitionCategory {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description || '',
    theme: row.theme || 'neutral',
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order || 0),
  };
}

export function ExhibitionCategoryProvider({ children }: { children: React.ReactNode }) {
  const [allCategories, setAllCategories] = useState<ExhibitionCategory[]>([]);
  const { isAdmin } = useAuth();
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);

  const refreshCategories = useCallback(async () => {
    const { data, error } = await supabase.from('exhibition_categories').select('*').order('sort_order').order('name');
    if (error) {
      console.error('Could not load exhibition categories:', error.message);
      setLoading(false);
      return;
    }
    const mapped = (data || []).map(mapCategory);
    setAllCategories(mapped);
    const savedId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const saved = mapped.find((category) => category.id === savedId);
    const defaultCategory = mapped.find((category) => category.slug === DEFAULT_SLUG && category.active)
      || mapped.find((category) => category.active);
    const current = mapped.find((category) => category.id === selectedId);
    const next = (current && (current.active || isAdmin) ? current : null)
      || (saved && (saved.active || isAdmin) ? saved : null)
      || defaultCategory;
    if (next) setSelectedId(next.id);
    setLoading(false);
  }, [selectedId, isAdmin]);

  useEffect(() => {
    void refreshCategories();
    const channel = supabase.channel('exhibition-categories-context')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exhibition_categories' }, () => void refreshCategories())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [refreshCategories]);

  useEffect(() => {
    if (!selectedId) return;
    const category = allCategories.find((item) => item.id === selectedId);
    if (category) {
      localStorage.setItem(STORAGE_KEY, selectedId);
      document.documentElement.dataset.exhibitorTheme = category.theme;
    }
  }, [selectedId, allCategories]);

  const setActiveCategory = useCallback((id: string) => {
    if (allCategories.some((category) => category.id === id)) setSelectedId(id);
  }, [allCategories]);

  // Supabase RLS already limits vendors to active categories plus categories
  // attached to their own historical reservations. Keep those archived entries
  // available so users can still switch back to old permits.
  const categories = useMemo(() => allCategories, [allCategories]);
  const activeCategory = categories.find((category) => category.id === selectedId) || categories[0] || null;

  const value = useMemo(() => ({ categories, activeCategory, loading, setActiveCategory, refreshCategories }), [categories, activeCategory, loading, setActiveCategory, refreshCategories]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useExhibitionCategory() {
  const context = useContext(Context);
  if (!context) throw new Error('useExhibitionCategory must be used inside ExhibitionCategoryProvider');
  return context;
}

