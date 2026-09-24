import React, { useState } from 'react';
import { FilterState, ItemCategory, ItemRarity, StoreCategoryDef } from '../types';
import { Search, SlidersHorizontal, X, ArrowUpDown, Sparkles } from 'lucide-react';
import { formatCurrencyBRL } from '../utils/payment';
import { FALLBACK_CATEGORIES } from '../utils/catalog';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  totalResults: number;
  categories?: StoreCategoryDef[];
}

const RARITIES: { id: ItemRarity | 'all'; label: string }[] = [
  { id: 'all', label: 'Todas Raridades' },
  { id: 'graal', label: 'Santo Graal' },
  { id: 'mitico', label: 'Mítico' },
  { id: 'lendario', label: 'Lendário' },
  { id: 'epico', label: 'Épico' },
  { id: 'raro', label: 'Raro' },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  totalResults,
  categories,
}) => {
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const categoryOptions: { id: ItemCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'Todas Categorias' },
    ...(categories && categories.length ? categories : FALLBACK_CATEGORIES).map((c) => ({
      id: c.id as ItemCategory,
      label: c.label,
    })),
  ];

  const activeFiltersCount = 
    (filters.category !== 'all' ? 1 : 0) +
    (filters.rarity !== 'all' ? 1 : 0) +
    (filters.searchQuery.trim() !== '' ? 1 : 0) +
    (filters.maxPrice < 80000 ? 1 : 0);

  const handleReset = () => {
    onFilterChange({
      searchQuery: '',
      category: 'all',
      rarity: 'all',
      condition: 'all',
      minPrice: 0,
      maxPrice: 80000,
      sortBy: 'featured',
    });
  };

  return (
    <div className="space-y-3">
      {/* Search Input and Primary Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome, edição, franquia ou ano..."
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            className="w-full h-11 pl-10 pr-10 rounded-xl bg-white border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 shadow-xs transition"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
              aria-label="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[140px] shrink-0">
            <select
              value={filters.sortBy}
              onChange={(e) => onFilterChange({ ...filters, sortBy: e.target.value as FilterState['sortBy'] })}
              className="w-full h-11 px-3 pr-8 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:border-amber-500 shadow-xs appearance-none cursor-pointer"
            >
              <option value="featured">Destaques do Cofre</option>
              <option value="price_asc">Menor Preço</option>
              <option value="price_desc">Maior Preço</option>
              <option value="rarity">Maior Raridade</option>
              <option value="newest">Mais Recentes</option>
            </select>
            <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Filter Toggle for Mobile/Tablet */}
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className={`min-h-[44px] px-3 rounded-xl border text-xs font-medium flex items-center gap-2 transition md:hidden ${
              activeFiltersCount > 0 
                ? 'bg-amber-50 border-amber-300 text-amber-900' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-600 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Desktop / Expanded Interactive Segmented Filter Controls */}
      <div className={`space-y-3 ${showMobileFilters ? 'block' : 'hidden md:block'}`}>
        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categoryOptions.map((cat) => {
            const isActive = filters.category === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onFilterChange({ ...filters, category: cat.id })}
                className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-medium transition active:scale-95 shrink-0 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Rarities Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider pl-1 mr-1 shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Raridade:
          </span>
          {RARITIES.map((rar) => {
            const isActive = filters.rarity === rar.id;
            return (
              <button
                key={rar.id}
                onClick={() => onFilterChange({ ...filters, rarity: rar.id })}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition active:scale-95 shrink-0 ${
                  isActive
                    ? 'bg-amber-600 text-white font-semibold shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-amber-50/50 border border-slate-200/70'
                }`}
              >
                {rar.label}
              </button>
            );
          })}

          {activeFiltersCount > 0 && (
            <button
              onClick={handleReset}
              className="text-xs text-slate-500 hover:text-rose-600 font-medium px-2 py-1 ml-auto shrink-0 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpar filtros ({totalResults})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
