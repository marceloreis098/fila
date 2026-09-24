import React, { useState } from 'react';
import { CollectibleItem, StoreSiteSettings } from '../types';
import { formatCurrencyBRL } from '../utils/payment';
import { productWhatsAppMessage, whatsAppLink } from '../utils/wa';
import { getCategoryLabel } from '../utils/catalog';
import { ShieldCheck, Eye, Sparkles, MessageCircle } from 'lucide-react';

interface ProductCardProps {
  item: CollectibleItem;
  onSelect: (item: CollectibleItem) => void;
  settings: StoreSiteSettings;
}

const RARITY_LABELS: Record<string, { label: string; textClass: string }> = {
  comum: { label: 'Comum', textClass: 'text-slate-600' },
  raro: { label: 'Raro', textClass: 'text-blue-700' },
  epico: { label: 'Épico', textClass: 'text-purple-700' },
  lendario: { label: 'Lendário', textClass: 'text-amber-700' },
  mitico: { label: 'Mítico', textClass: 'text-rose-700' },
  graal: { label: 'Santo Graal', textClass: 'text-amber-600 font-bold' },
};

export const ProductCard: React.FC<ProductCardProps> = ({ item, onSelect, settings }) => {
  const [imageError, setImageError] = useState(false);
  const rarityInfo = RARITY_LABELS[item.rarity] || { label: item.rarity, textClass: 'text-slate-600' };
  const isOut = item.stock <= 0;
  const waHref = whatsAppLink(
    settings.contacts.whatsappNumber,
    productWhatsAppMessage(settings, item)
  );

  return (
    <div className="group relative flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-lg hover:border-amber-300/60 transition-all duration-300 overflow-hidden">
      {/* Visual Container */}
      <div 
        onClick={() => onSelect(item)}
        className="relative aspect-4/3 w-full bg-[#F5F5F4] overflow-hidden cursor-pointer flex items-center justify-center"
      >
        {!imageError ? (
          <img
            src={item.image}
            alt={item.name}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-radial from-slate-100 to-slate-200 text-slate-500">
            <Sparkles className="w-10 h-10 text-amber-500 mb-2 opacity-60" />
            <span className="text-xs font-medium text-center">{item.franchise}</span>
          </div>
        )}

        {/* Floating Quick Action Overlay */}
        <div className="absolute inset-0 bg-slate-900/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-3 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(item);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/95 text-slate-800 text-xs font-medium hover:bg-white shadow-md active:scale-95 transition"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Ver Detalhes</span>
            </button>
          </div>
        </div>

        {/* Stock Alert Overlay */}
        {item.stock <= 2 && item.stock > 0 && (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[11px] font-semibold shadow-xs">
            Restam {item.stock} un.
          </div>
        )}
        {item.stock === 0 && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center">
            <span className="px-3 py-1 rounded-md bg-white text-slate-900 text-xs font-bold uppercase tracking-wider">
              Esgotado no Cofre
            </span>
          </div>
        )}
      </div>

      {/* Content details following Zero-Pill & Clean Typography Discipline */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Metadata line with natural typographic separator */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5 flex-wrap">
            <span className="uppercase tracking-wider text-[10px] font-semibold text-slate-400">
              {getCategoryLabel(settings.categories, item.category)}
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className={`text-[11px] font-medium ${rarityInfo.textClass}`}>
              {rarityInfo.label}
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-[11px] text-slate-500 font-mono-nums">{item.year}</span>
          </div>

          {/* Product Title */}
          <h3 
            onClick={() => onSelect(item)}
            className="text-sm font-semibold text-slate-900 line-clamp-2 hover:text-amber-700 transition cursor-pointer leading-snug"
          >
            {item.name}
          </h3>

          {/* Condition note */}
          <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate">{item.condition}</span>
          </div>
        </div>

        {/* Pricing + WhatsApp CTA */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="text-base font-bold text-slate-900 font-mono-nums tracking-tight">
            {formatCurrencyBRL(item.price)}
          </div>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition active:scale-95 ${
              isOut
                ? 'bg-slate-100 text-slate-500 pointer-events-none'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
            }`}
            title={isOut ? 'Item esgotado — consulte no WhatsApp' : 'Consultar e comprar no WhatsApp'}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{isOut ? 'Esgotado' : 'Comprar'}</span>
          </a>
        </div>
      </div>
    </div>
  );
};