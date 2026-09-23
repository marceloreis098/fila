import React from 'react';
import { CollectibleItem } from '../types';
import { formatCurrencyBRL } from '../utils/payment';
import { X, ShieldCheck, Truck, Award, Lock } from 'lucide-react';

interface ProductDetailModalProps {
  item: CollectibleItem | null;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  item,
  onClose,
}) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="relative w-full max-w-4xl bg-white rounded-2xl md:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col md:flex-row"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/90 text-slate-500 hover:text-slate-900 hover:bg-white shadow-md transition"
          aria-label="Fechar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Gallery / Image Left Side */}
        <div className="w-full md:w-1/2 bg-[#F8F8F7] p-6 md:p-10 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-slate-100">
          <div className="relative w-full max-w-sm aspect-4/3 rounded-2xl overflow-hidden shadow-md bg-white">
            <img
              src={item.image}
              alt={item.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center"
            />
          </div>

          {/* Certificate Stamp */}
          <div className="mt-4 w-full max-w-sm p-3 rounded-xl bg-amber-500/10 border border-amber-300/60 flex items-center gap-3 text-amber-900">
            <Award className="w-6 h-6 text-amber-600 shrink-0" />
            <div className="text-xs">
              <div className="font-bold">Autenticidade Garantida</div>
              <div className="text-[11px] text-amber-800 line-clamp-1">{item.authenticityCert}</div>
            </div>
          </div>
        </div>

        {/* Details & Purchase Module Right Side */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col overflow-y-auto">
          {/* Header Metadata */}
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <span className="font-semibold uppercase tracking-wider text-amber-700">
              {item.franchise}
            </span>
            <span>·</span>
            <span>{item.condition}</span>
            <span>·</span>
            <span className="font-mono-nums">{item.year}</span>
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">
            {item.name}
          </h2>

          {/* Price Block — vitrine (compra indisponível até gateway real) */}
          <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-bold text-slate-900 font-mono-nums">
                {formatCurrencyBRL(item.price)}
              </span>
              {item.originalPrice && (
                <span className="text-sm line-through text-slate-400 font-mono-nums">
                  {formatCurrencyBRL(item.originalPrice)}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Valor de referência da curadoria · disponibilidade sob consulta
            </div>
          </div>

          {/* Description */}
          <div className="mt-5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
              Sobre a Peça de Colecionador
            </h4>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              {item.description}
            </p>
          </div>

          {/* Specifications Table */}
          <div className="mt-5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Ficha Técnica & Estado
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {item.specs.map((spec, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">{spec.label}</div>
                  <div className="text-slate-800 font-medium truncate">{spec.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Guarantees */}
          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Logística via <strong>Sedex com seguro total</strong> para todo o Brasil.</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Peça em curadoria — disponibilidade sob consulta pelo atendimento da loja.</span>
            </div>
          </div>

          {/* Purchase disabled notice */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-center">
              A compra online está temporariamente desativada.
              <span className="block text-[11px] text-amber-800 mt-0.5">
                Consulte a disponibilidade pelo WhatsApp ou telefone da loja.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
