import React from 'react';
import { CartItem } from '../types';
import { formatCurrencyBRL } from '../utils/payment';
import { X, Trash2, Plus, Minus, ShoppingBag, ShieldCheck, ArrowRight } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
}) => {
  if (!isOpen) return null;

  const subtotal = cart.reduce((acc, curr) => acc + curr.item.price * curr.quantity, 0);
  const isFreeShipping = subtotal >= 500;
  const shipping = isFreeShipping || subtotal === 0 ? 0 : 45;
  const total = subtotal + shipping;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-700">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Seu Cofre de Coleção</h3>
              <p className="text-xs text-slate-500">{cart.length} {cart.length === 1 ? 'item' : 'itens'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
            aria-label="Fechar carrinho"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-700" />
              <p className="text-sm font-semibold text-slate-700">Seu carrinho está vazio</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Explore as relíquias do catálogo e adicione itens colecionáveis raros.
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition"
              >
                Explorar Catálogo
              </button>
            </div>
          ) : (
            cart.map(({ item, quantity }) => (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-slate-200/80 bg-white flex gap-3 shadow-2xs hover:border-amber-300/60 transition"
              >
                {/* Thumbnail */}
                <div className="w-18 h-18 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                  <img
                    src={item.image}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-xs font-semibold text-slate-900 line-clamp-1 leading-snug">
                        {item.name}
                      </h4>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Remover do carrinho"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {item.condition}
                    </div>
                  </div>

                  {/* Quantity and Price */}
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                      <button
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        className="p-1 hover:bg-white text-slate-600 transition rounded-l-lg"
                        title="Diminuir"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-xs font-bold font-mono-nums text-slate-800">
                        {quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        disabled={quantity >= item.stock}
                        className="p-1 hover:bg-white text-slate-600 transition rounded-r-lg disabled:opacity-40"
                        title="Aumentar"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="text-xs font-bold text-slate-900 font-mono-nums">
                      {formatCurrencyBRL(item.price * quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with Summary & Checkout */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-3">
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal dos itens:</span>
                <span className="font-semibold text-slate-800 font-mono-nums">{formatCurrencyBRL(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Envio com seguro Sedex:</span>
                </span>
                <span className="font-semibold text-emerald-700 font-mono-nums">
                  {shipping === 0 ? 'GRÁTIS' : formatCurrencyBRL(shipping)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-900">Total do Pedido:</span>
                <div className="text-right">
                  <div className="text-lg font-bold text-slate-900 font-mono-nums">
                    {formatCurrencyBRL(total)}
                  </div>
                  <div className="text-[10px] text-emerald-700">
                    ou {formatCurrencyBRL(total * 0.95)} via PIX (5% OFF)
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={onProceedToCheckout}
              className="w-full h-12 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-md active:scale-98 transition flex items-center justify-center gap-2"
            >
              <span>Prosseguir para Pagamento</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
