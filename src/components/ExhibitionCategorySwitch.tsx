'use client';

import { ChevronDown, PawPrint, Store } from 'lucide-react';
import { useExhibitionCategory } from '@/lib/exhibition-category';

const themeClass: Record<string, string> = {
  peach: 'border-orange-200 bg-orange-100 text-orange-950',
  green: 'border-emerald-200 bg-emerald-100 text-emerald-950',
  neutral: 'border-slate-200 bg-slate-100 text-slate-900',
};

export function ExhibitionCategorySwitch({ compact = false }: { compact?: boolean }) {
  const { categories, activeCategory, setActiveCategory } = useExhibitionCategory();
  if (!activeCategory || categories.length === 0) return null;

  if (categories.length > 2) {
    return (
      <label className="relative inline-flex items-center">
        <span className="sr-only">Switch exhibition category</span>
        <select
          value={activeCategory.id}
          onChange={(event) => setActiveCategory(event.target.value)}
          className={`max-w-48 appearance-none rounded-full border py-2 pl-3 pr-8 text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 ${themeClass[activeCategory.theme] || themeClass.neutral}`}
        >
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5" />
      </label>
    );
  }

  return (
    <div role="group" aria-label="Switch exhibition category" className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
      {categories.map((category, index) => {
        const selected = category.id === activeCategory.id;
        const Icon = index === 0 ? PawPrint : Store;
        const selectedTheme = category.theme === 'peach' ? 'bg-orange-100 text-orange-950' : category.theme === 'green' ? 'bg-emerald-100 text-emerald-950' : 'bg-slate-100 text-slate-900';
        return (
          <button
            key={category.id}
            type="button"
            aria-pressed={selected}
            aria-label={category.name}
            onClick={() => setActiveCategory(category.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 ${selected ? `${selectedTheme} shadow-sm` : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className={compact ? 'hidden sm:inline' : ''}>{category.name}</span>
          </button>
        );
      })}
    </div>
  );
}
