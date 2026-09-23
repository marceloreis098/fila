import React, { useState } from 'react';
import { CollectibleItem } from '../types';
import { formatCurrencyBRL } from '../utils/payment';
import { X, ShieldCheck, ShoppingBag, Truck, Lock, Award, Zap, Check } from 'lucide-react';

interface ProductDetailModalProps {
  item: CollectibleItem | null;
  onClose: () => void;
  onAddToCart: (item: CollectibleItem) => void;
  onBuyNow: (item: CollectibleItem) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  item,
  onClose,
  onAddToCart,
  onBuyNow,
}) => {
  const [addedAnimation, setAddedAnimation] = useState(false);

  if (!item) return null;

  const pixPrice = item.price * 0.95; // 5% de desconto no Pix à vista

  const handleAdd = () => {
    onAddToCart(item);
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1500);
  };

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

          {/* Price Block with Brazilian Payment Options */}
          <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
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

            {/* Pix discount highlight */}
            <div className="flex items-center gap-2 text-xs text-emerald-800 font-medium">
              <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>{formatCurrencyBRL(pixPrice)}</strong> à vista no <strong>PIX</strong> (5% de desconto)
              </span>
            </div>

            <div className="text-xs text-slate-600">
              Ou em até <strong className="text-slate-800">12x no cartão de crédito</strong> (sem juros até 6x de {formatCurrencyBRL(item.price / 6)})
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
              <span>Envio blindado via <strong>Sedex com seguro total</strong> para todo o Brasil.</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Transação protegida com certificação SSL e antifraude bancário.</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-3">
            <button
              onClick={handleAdd}
              disabled={item.stock === 0}
              className={`flex-1 min-h-[48px] px-4 rounded-xl border border-slate-300 font-semibold text-xs md:text-sm flex items-center justify-center gap-2 transition active:scale-95 ${
                addedAnimation 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                  : 'hover:bg-slate-100 text-slate-800'
              }`}
            >
              {addedAnimation ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Adicionado!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>Adicionar ao Carrinho</span>
                </>
              )}
            </button>

            <button
              onClick={() => onBuyNow(item)}
              disabled={item.stock === 0}
              className="flex-1 min-h-[48px] px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs md:text-sm shadow-md active:scale-95 transition flex items-center justify-center gap-2"
            >
              Comprar Imediatamente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
