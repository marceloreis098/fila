import React from 'react';
import { AppNotification } from '../types';
import { Bell, CheckCheck, Package, CreditCard, ShieldAlert, Sparkles, X } from 'lucide-react';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onSelectNotification: (notif: AppNotification) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  onSelectNotification,
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'payment':
        return <CreditCard className="w-4 h-4 text-emerald-600" />;
      case 'shipping':
        return <Package className="w-4 h-4 text-blue-600" />;
      case 'stock':
        return <ShieldAlert className="w-4 h-4 text-amber-600" />;
      case 'order':
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-700">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Notificações do Sistema</h3>
              <p className="text-xs text-slate-500">
                {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Todas as notificações lidas'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-xs text-amber-700 hover:text-amber-800 font-medium px-2 py-1 rounded hover:bg-amber-50 flex items-center gap-1"
                title="Marcar todas como lidas"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ler todas</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
          {notifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Nenhuma notificação por enquanto</p>
              <p className="text-xs text-slate-400 mt-1">
                Atualizações de pedidos e avisos da loja aparecerão aqui.
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => onSelectNotification(notif)}
                className={`p-3.5 rounded-xl transition cursor-pointer flex gap-3 ${
                  notif.read ? 'bg-white hover:bg-slate-50' : 'bg-amber-50/50 hover:bg-amber-50/80 border border-amber-200/60'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`text-xs font-semibold ${notif.read ? 'text-slate-800' : 'text-slate-900 font-bold'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono-nums">
                      {new Date(notif.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed line-clamp-2">
                    {notif.message}
                  </p>
                  {notif.orderId && (
                    <span className="inline-block mt-1.5 text-[11px] font-mono-nums font-medium text-amber-700">
                      Pedido #{notif.orderId}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
          <p className="text-[11px] text-slate-500">
            Disparos automáticos com suporte a Webhook, WhatsApp e E-mail
          </p>
        </div>
      </div>
    </div>
  );
};
