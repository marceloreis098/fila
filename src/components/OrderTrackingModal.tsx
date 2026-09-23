import React from 'react';
import { Order, OrderStatus } from '../types';
import { formatCurrencyBRL } from '../utils/payment';
import { 
  X, 
  Package, 
  CheckCircle2, 
  Clock, 
  Truck, 
  ShieldCheck, 
  ExternalLink, 
  Copy, 
  MessageCircle,
  AlertCircle
} from 'lucide-react';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  selectedOrderId?: string | null;
  onSelectOrder?: (orderId: string) => void;
}

const STATUS_STEPS: { key: OrderStatus; label: string; description: string }[] = [
  { key: 'pending_payment', label: 'Aguardando Pagamento', description: 'Aguardando compensação do banco' },
  { key: 'paid', label: 'Pagamento Aprovado', description: 'Transação validada pelo gateway seguro' },
  { key: 'in_preparation', label: 'Em Separação no Cofre', description: 'Inspeção de autenticidade e embalagem blindada' },
  { key: 'shipped', label: 'Postado nos Correios', description: 'Em trânsito com seguro contra extravio' },
  { key: 'delivered', label: 'Entregue ao Colecionador', description: 'Item entregue e recebido com sucesso' },
];

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  orders,
  selectedOrderId,
  onSelectOrder,
}) => {
  if (!isOpen) return null;

  const currentOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];

  const getStepIndex = (status: OrderStatus) => {
    switch (status) {
      case 'pending_payment': return 0;
      case 'paid': return 1;
      case 'in_preparation': return 2;
      case 'shipped': return 3;
      case 'delivered': return 4;
      case 'cancelled': return -1;
      default: return 0;
    }
  };

  const currentStepIndex = currentOrder ? getStepIndex(currentOrder.status) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-white rounded-2xl md:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm md:text-base">Rastreamento de Pedidos</h3>
              <p className="text-xs text-slate-500">Acompanhamento de status e envio em tempo real</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-5">
          {orders.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-30 text-slate-500" />
              <p className="text-sm font-semibold text-slate-700">Nenhum pedido realizado ainda</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Assim que você concluir uma compra na loja, o rastreamento detalhado aparecerá aqui.
              </p>
            </div>
          ) : (
            <>
              {/* Selector if multiple orders exist */}
              {orders.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-xs font-semibold text-slate-500 shrink-0">Seus Pedidos:</span>
                  {orders.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => onSelectOrder?.(o.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono-nums transition shrink-0 ${
                        currentOrder.id === o.id
                          ? 'bg-slate-900 text-white font-bold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      #{o.id} ({o.status === 'paid' ? 'Pago' : o.status})
                    </button>
                  ))}
                </div>
              )}

              {/* Current Order Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <div className="text-xs text-slate-500">Identificador do Pedido</div>
                    <div className="text-base font-bold text-slate-900 font-mono-nums">
                      #{currentOrder.id}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-xs text-slate-500">Data da Compra</div>
                    <div className="text-xs font-medium text-slate-800">
                      {new Date(currentOrder.createdAt).toLocaleDateString('pt-BR')} às {new Date(currentOrder.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                {/* Tracking Code with copy button */}
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-slate-200">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-600" />
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Código de Rastreio Sedex</div>
                      <div className="text-xs font-bold font-mono-nums text-slate-800">{currentOrder.trackingCode}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(currentOrder.trackingCode)}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1"
                    title="Copiar código de rastreamento"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </button>
                </div>

                {/* Ordered Items Preview */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-xs font-semibold text-slate-600">Itens Comprados:</div>
                  {currentOrder.items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-slate-700">
                      <span className="truncate max-w-[280px]">
                        {it.quantity}x {it.item.name}
                      </span>
                      <span className="font-mono-nums font-semibold">
                        {formatCurrencyBRL(it.unitPrice * it.quantity)}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-slate-200 flex justify-between text-xs font-bold text-slate-900">
                    <span>Total do Pedido:</span>
                    <span className="font-mono-nums">{formatCurrencyBRL(currentOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Linha do Tempo do Pedido
                </h4>

                {currentOrder.status === 'cancelled' ? (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>Este pedido foi cancelado pelo cliente ou pelo administrador.</span>
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {STATUS_STEPS.map((step, idx) => {
                      const isCompleted = idx <= currentStepIndex;
                      const isCurrent = idx === currentStepIndex;

                      return (
                        <div key={step.key} className="relative flex items-start gap-3">
                          {/* Dot / Check indicator */}
                          <div
                            className={`absolute -left-6 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 border-2 transition-colors ${
                              isCompleted
                                ? 'bg-amber-600 border-amber-600 text-white'
                                : 'bg-white border-slate-300 text-slate-400'
                            }`}
                          >
                            {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-baseline justify-between">
                              <span
                                className={`text-xs font-bold ${
                                  isCurrent ? 'text-amber-700' : isCompleted ? 'text-slate-900' : 'text-slate-400'
                                }`}
                              >
                                {step.label}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                  Status Atual
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* WhatsApp Notification trigger */}
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Dúvidas ou atualizações sobre este envio? Fale com nosso suporte.</span>
                </div>
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `Olá! Gostaria de informações sobre o pedido #${currentOrder.id} (${currentOrder.trackingCode}).`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1 shrink-0"
                >
                  <span>WhatsApp</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
