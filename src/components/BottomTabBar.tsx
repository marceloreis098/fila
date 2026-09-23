import React from 'react';
import { Home, Search, Truck, Shield } from 'lucide-react';

interface BottomTabBarProps {
  currentView: 'store' | 'admin' | 'tracking';
  onNavigate: (view: 'store' | 'admin' | 'tracking') => void;
  ordersCount: number;
  onSearchFocus: () => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  currentView,
  onNavigate,
  ordersCount,
  onSearchFocus,
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg pb-safe">
      <div className="grid grid-cols-4 items-center h-16 max-w-md mx-auto px-2">
        {/* Tab 1: Loja */}
        <button
          onClick={() => onNavigate('store')}
          className={`min-h-[44px] min-w-[44px] flex flex-col items-center justify-center transition active:scale-90 ${
            currentView === 'store' ? 'text-amber-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="Loja"
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Loja</span>
        </button>

        {/* Tab 2: Buscar */}
        <button
          onClick={() => {
            onNavigate('store');
            onSearchFocus();
          }}
          className="min-h-[44px] min-w-[44px] flex flex-col items-center justify-center text-slate-500 hover:text-slate-800 transition active:scale-90"
          aria-label="Buscar"
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Buscar</span>
        </button>

        {/* Tab 3: Rastrear */}
        <button
          onClick={() => onNavigate('tracking')}
          className={`min-h-[44px] min-w-[44px] relative flex flex-col items-center justify-center transition active:scale-90 ${
            currentView === 'tracking' ? 'text-amber-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="Rastreamento"
        >
          <div className="relative">
            <Truck className="w-5 h-5" />
            {ordersCount > 0 && (
              <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-blue-600" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1">Rastreio</span>
        </button>

        {/* Tab 4: Admin */}
        <button
          onClick={() => onNavigate('admin')}
          className={`min-h-[44px] min-w-[44px] flex flex-col items-center justify-center transition active:scale-90 ${
            currentView === 'admin' ? 'text-amber-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="Painel Administrativo"
        >
          <Shield className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Admin</span>
        </button>
      </div>
    </div>
  );
};