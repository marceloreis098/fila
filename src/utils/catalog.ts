import { CollectibleItem, StoreCategoryDef } from '../types';

// Categorias padrão de fábrica (usadas quando não há configuração salva)
export const FALLBACK_CATEGORIES: StoreCategoryDef[] = [
  { id: 'tcg', label: 'Cartas TCG' },
  { id: 'figures', label: 'Estátuas & Figures' },
  { id: 'coins', label: 'Moedas Históricas' },
  { id: 'retro', label: 'Retrogames' },
  { id: 'comics', label: 'Quadrinhos Clássicos' },
  { id: 'vinyl', label: 'Vinis Históricos' },
];

const humanize = (id: string) =>
  id
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

// Rótulo amigável de uma categoria (respeita a lista gerenciada no painel)
export function getCategoryLabel(categories: StoreCategoryDef[] | undefined, id: string): string {
  const list = categories && categories.length ? categories : FALLBACK_CATEGORIES;
  return list.find((c) => c.id === id)?.label || id;
}

// Lista exibida na vitrine/filtros: categorias gerenciadas + categorias órfãs
// presentes em produtos (para nunca esconder itens após uma remoção indevida).
export function buildCategoryList(
  categories: StoreCategoryDef[] | undefined,
  products: CollectibleItem[]
): StoreCategoryDef[] {
  const map = new Map<string, StoreCategoryDef>();
  const base = categories && categories.length ? categories : FALLBACK_CATEGORIES;
  for (const c of base) map.set(c.id, c);
  for (const p of products) {
    const id = p?.category;
    if (!id) continue;
    if (!map.has(id)) map.set(id, { id, label: humanize(id) || id });
  }
  return [...map.values()];
}

// Slug seguro (minúsculas, sem acentos, hífens em vez de espaços)
export function slugifyCategory(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}