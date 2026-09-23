import React from 'react';
import { PWAInstallButton } from './PWAInstallButton';
import { ShoppingBag, Bell, Shield, Search } from 'lucide-react';

interface HeaderProps {
  currentView: 'store' | 'admin' | 'tracking';
  onNavigate: (view: 'store' | 'admin' | 'tracking') => void;
  cartCount: number;
  unreadNotificationsCount: number;
  onOpenCart: () => void;
  onOpenNotifications: () => void;
  onSearchFocus: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  cartCount,
  unreadNotificationsCount,
  onOpenCart,
  onOpenNotifications,
  onSearchFocus,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      {/* Strict One-Row Three-Zone Top Bar Contract */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => onNavigate('store')}
          className="text-left group cursor-pointer focus:outline-none"
        >
          <span className="text-xl font-bold tracking-tight text-slate-900 font-display flex items-center gap-1.5">
            <span className="w-6 h-6 rounded-md bg-slate-900 text-amber-400 flex items-center justify-center text-xs font-bold font-serif shadow-xs">
              R
            </span>
            <span className="text-slate-900">Relic<span className="text-amber-600">Vault</span></span>
          </span>
        </button>

        {/* Zone 2: 4 clean text navigation links (desktop) */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <button
            onClick={() => onNavigate('store')}
            className={`transition-colors hover:text-slate-900 whitespace-nowrap cursor-pointer ${
              currentView === 'store' ? 'text-slate-900 font-bold border-b-2 border-amber-600 -mb-0.5 pb-0.5' : ''
            }`}
          >
            Catálogo & Raridades
          </button>
          <button
            onClick={() => onNavigate('tracking')}
            className={`transition-colors hover:text-slate-900 whitespace-nowrap cursor-pointer ${
              currentView === 'tracking' ? 'text-slate-900 font-bold border-b-2 border-amber-600 -mb-0.5 pb-0.5' : ''
            }`}
          >
            Rastreio de Pedidos
          </button>
          <button
            onClick={() => onNavigate('admin')}
            className={`transition-colors hover:text-slate-900 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              currentView === 'admin' ? 'text-slate-900 font-bold border-b-2 border-amber-600 -mb-0.5 pb-0.5' : ''
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            <span>Painel Administrativo</span>
          </button>
        </nav>

        {/* Zone 3: Primary actions (Search, Notifications, Cart, PWA Install) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search affordance */}
          <button
            onClick={onSearchFocus}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
            title="Buscar colecionáveis"
            aria-label="Buscar colecionáveis"
          >
            <Search className="w-4 h-4 md:w-4.5 md:h-4.5" />
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            title="Notificações de status"
            aria-label="Ver notificações"
          >
            <Bell className="w-4 h-4 md:w-4.5 md:h-4.5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-600 text-white text-[10px] font-bold font-mono-nums flex items-center justify-center animate-pulse">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Cart Button */}
          <button
            onClick={onOpenCart}
            className="relative flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition active:scale-95"
            title="Abrir carrinho"
            aria-label="Carrinho de compras"
          >
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline font-mono-nums">{cartCount}</span>
            {cartCount > 0 && (
              <span className="sm:hidden w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold font-mono-nums flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>

          {/* PWA Install Button */}
          <div className="hidden sm:block">
            <PWAInstallButton compact />
          </div>
        </div>
      </div>
    </header>
  );
};
