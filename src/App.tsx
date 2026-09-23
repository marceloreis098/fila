/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CollectibleItem, 
  CartItem, 
  Order, 
  OrderStatus, 
  AppNotification, 
  FilterState 
} from './types';
import { INITIAL_PRODUCTS } from './data/initialProducts';
import { Header } from './components/Header';
import { BottomTabBar } from './components/BottomTabBar';
import { Hero } from './components/Hero';
import { FilterBar } from './components/FilterBar';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { NotificationCenter } from './components/NotificationCenter';
import { AdminPanel } from './components/AdminPanel';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { 
  ShieldCheck, 
  Package, 
  Sparkles, 
  Bell, 
  CheckCircle2, 
  Smartphone,
  Info
} from 'lucide-react';

const STORAGE_KEYS = {
  PRODUCTS: 'relicvault_products_v1',
  CART: 'relicvault_cart_v1',
  ORDERS: 'relicvault_orders_v1',
  NOTIFICATIONS: 'relicvault_notifications_v1',
};

export default function App() {
  // Navigation View
  const [currentView, setCurrentView] = useState<'store' | 'admin' | 'tracking'>('store');

  // Products state (persisted)
  const [products, setProducts] = useState<CollectibleItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_PRODUCTS;
  });

  // Cart state (persisted)
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CART);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });

  // Orders state (persisted)
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });

  // Notifications state (persisted)
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      {
        id: 'notif-welcome',
        title: 'Bem-vindo ao RelicVault',
        message: 'Explore nosso catálogo de itens colecionáveis autênticos com pagamento seguro via PIX e cartão em até 12x.',
        timestamp: new Date().toISOString(),
        type: 'system',
        read: false,
      },
    ];
  });

  // Active Floating Toast
  const [activeToast, setActiveToast] = useState<{ title: string; message: string } | null>(null);

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    category: 'all',
    rarity: 'all',
    condition: 'all',
    minPrice: 0,
    maxPrice: 80000,
    sortBy: 'featured',
  });

  // Modals & Drawers
  const [selectedProduct, setSelectedProduct] = useState<CollectibleItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [selectedTrackingOrderId, setSelectedTrackingOrderId] = useState<string | null>(null);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  // Catalog Section ref for smooth scrolling
  const catalogRef = useRef<HTMLDivElement>(null);

  // Persist states
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.error(e);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
    } catch (e) {
      console.error(e);
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    } catch (e) {
      console.error(e);
    }
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    } catch (e) {
      console.error(e);
    }
  }, [notifications]);

  // Automated notification dispatcher
  const pushNotification = (
    title: string,
    message: string,
    type: AppNotification['type'] = 'system',
    orderId?: string
  ) => {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orderId,
      title,
      message,
      timestamp: new Date().toISOString(),
      type,
      read: false,
    };

    setNotifications((prev) => [newNotif, ...prev]);
    setActiveToast({ title, message });
    setTimeout(() => setActiveToast(null), 4000);
  };

  // Cart operations
  const handleAddToCart = (item: CollectibleItem) => {
    if (item.stock === 0) return;

    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        if (existing.quantity >= item.stock) return prev;
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const handleUpdateCartQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.item.id === itemId) {
            const newQty = c.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > c.item.stock) return c;
            return { ...c, quantity: newQty };
          }
          return c;
        })
        .filter((c): c is CartItem => c !== null)
    );
  };

  const handleRemoveCartItem = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.item.id !== itemId));
  };

  const handleBuyNow = (item: CollectibleItem) => {
    handleAddToCart(item);
    setSelectedProduct(null);
    setIsCheckoutOpen(true);
  };

  // Order created handler
  const handleOrderCreated = (newOrder: Order) => {
    // 1. Deduct stock from products
    setProducts((prev) =>
      prev.map((prod) => {
        const orderItem = newOrder.items.find((it) => it.item.id === prod.id);
        if (orderItem) {
          const updatedStock = Math.max(0, prod.stock - orderItem.quantity);
          return { ...prod, stock: updatedStock };
        }
        return prod;
      })
    );

    // 2. Add to orders list
    setOrders((prev) => [newOrder, ...prev]);

    // 3. Clear cart
    setCart([]);

    // 4. Trigger automated notification
    if (newOrder.status === 'paid') {
      pushNotification(
        'Pagamento Confirmado!',
        `Seu pagamento de R$ ${newOrder.total.toLocaleString('pt-BR')} para o pedido #${newOrder.id} foi aprovado. A separação no cofre começará imediatamente.`,
        'payment',
        newOrder.id
      );
    } else {
      pushNotification(
        'Pedido Registrado com Sucesso',
        `Pedido #${newOrder.id} registrado via ${newOrder.paymentMethod.toUpperCase()}. Aguardando confirmação bancária.`,
        'order',
        newOrder.id
      );
    }
  };

  // Admin order status update with AUTOMATIC notifications
  const handleUpdateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          let statusText = '';
          switch (newStatus) {
            case 'paid':
              statusText = 'Pagamento aprovado pelo gateway financeiro.';
              break;
            case 'in_preparation':
              statusText = 'Item em processo de conferência, perícia e embalagem blindada.';
              break;
            case 'shipped':
              statusText = `Objeto postado nos Correios via Sedex com seguro total. Código: ${ord.trackingCode}`;
              break;
            case 'delivered':
              statusText = 'Item entregue e assinado no endereço do destinatário.';
              break;
            case 'cancelled':
              statusText = 'Pedido cancelado.';
              break;
            default:
              statusText = 'Atualização de status do pedido.';
          }

          const updatedHistory = [
            ...ord.history,
            {
              status: newStatus,
              timestamp: new Date().toISOString(),
              note: statusText,
            },
          ];

          return {
            ...ord,
            status: newStatus,
            history: updatedHistory,
          };
        }
        return ord;
      })
    );

    // Automatically push system notification
    let notifTitle = '';
    let notifMsg = '';
    let notifType: AppNotification['type'] = 'shipping';

    if (newStatus === 'paid') {
      notifTitle = `Pagamento Confirmado - Pedido #${orderId}`;
      notifMsg = `O pagamento do seu pedido foi validado com sucesso.`;
      notifType = 'payment';
    } else if (newStatus === 'in_preparation') {
      notifTitle = `Preparando Envio - Pedido #${orderId}`;
      notifMsg = `Seus itens colecionáveis estão no cofre de separação sendo inspecionados para envio.`;
      notifType = 'order';
    } else if (newStatus === 'shipped') {
      notifTitle = `Pedido Enviado! - #${orderId}`;
      notifMsg = `Seu pacote foi postado nos Correios com seguro integral. Acompanhe pelo rastreamento.`;
      notifType = 'shipping';
    } else if (newStatus === 'delivered') {
      notifTitle = `Pedido Entregue! - #${orderId}`;
      notifMsg = `Seu colecionável foi entregue. Esperamos que aprecie esta relíquia histórica!`;
      notifType = 'order';
    } else if (newStatus === 'cancelled') {
      notifTitle = `Pedido Cancelado - #${orderId}`;
      notifMsg = `O pedido #${orderId} foi cancelado no sistema.`;
      notifType = 'system';
    }

    if (notifTitle) {
      pushNotification(notifTitle, notifMsg, notifType, orderId);
    }
  };

  // Admin Product updates
  const handleAddProduct = (item: CollectibleItem) => {
    setProducts((prev) => [item, ...prev]);
    pushNotification(
      'Novo Item no Cofre',
      `O item "${item.name}" foi catalogado e adicionado ao estoque da loja.`,
      'stock'
    );
  };

  const handleUpdateProduct = (item: CollectibleItem) => {
    setProducts((prev) => prev.map((p) => (p.id === item.id ? item : p)));
  };

  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setCart((prev) => prev.filter((c) => c.item.id !== id));
  };

  const handleResetCatalog = () => {
    setProducts(INITIAL_PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    pushNotification('Catálogo Restaurado', 'O catálogo retornou aos 8 itens padrão de alta fidelidade.', 'system');
  };

  // Notification actions
  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleSelectNotification = (notif: AppNotification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    if (notif.orderId) {
      setSelectedTrackingOrderId(notif.orderId);
      setIsTrackingModalOpen(true);
      setIsNotificationCenterOpen(false);
    }
  };

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((item) => {
        // Query search
        if (filters.searchQuery.trim()) {
          const q = filters.searchQuery.toLowerCase();
          const matchName = item.name.toLowerCase().includes(q);
          const matchFranchise = item.franchise.toLowerCase().includes(q);
          const matchDesc = item.description.toLowerCase().includes(q);
          const matchYear = item.year.toString().includes(q);
          const matchCert = item.authenticityCert.toLowerCase().includes(q);
          if (!matchName && !matchFranchise && !matchDesc && !matchYear && !matchCert) {
            return false;
          }
        }

        // Category filter
        if (filters.category !== 'all' && item.category !== filters.category) {
          return false;
        }

        // Rarity filter
        if (filters.rarity !== 'all' && item.rarity !== filters.rarity) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === 'price_asc') return a.price - b.price;
        if (filters.sortBy === 'price_desc') return b.price - a.price;
        if (filters.sortBy === 'newest') return b.year - a.year;
        if (filters.sortBy === 'rarity') {
          const rarityRank: Record<string, number> = {
            graal: 6,
            mitico: 5,
            lendario: 4,
            epico: 3,
            raro: 2,
            comum: 1,
          };
          return (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0);
        }
        // default 'featured'
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      });
  }, [products, filters]);

  const totalCartCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);
  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const scrollToCatalog = () => {
    catalogRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-slate-900 pb-20 md:pb-12">
      {/* Offline Alert Indicator */}
      <OfflineIndicator />

      {/* Floating Instant Toast */}
      {activeToast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50 max-w-sm bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-start gap-3 animate-in slide-in-from-bottom-3 duration-200">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <Bell className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-100">{activeToast.title}</div>
            <div className="text-xs text-slate-300 mt-0.5 leading-snug line-clamp-2">{activeToast.message}</div>
          </div>
        </div>
      )}

      {/* Top Header (Strict Contract) */}
      <Header
        currentView={currentView}
        onNavigate={(v) => setCurrentView(v)}
        cartCount={totalCartCount}
        unreadNotificationsCount={unreadNotifCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenNotifications={() => setIsNotificationCenterOpen(true)}
        onSearchFocus={scrollToCatalog}
      />

      {/* MAIN VIEWPORT CONTENT */}
      <main className="flex-1">
        {currentView === 'store' && (
          <div>
            {/* Hero Showcase */}
            <Hero onExplore={scrollToCatalog} />

            {/* Catalog Section */}
            <div ref={catalogRef} className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-6">
              {/* Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                    Acervo do Cofre
                  </h2>
                  <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                    Itens raros com certificação de autenticidade e pronta entrega nacional
                  </p>
                </div>

                <div className="text-xs text-slate-500 font-mono-nums">
                  Exibindo <span className="font-semibold text-slate-800">{filteredProducts.length}</span> de {products.length} itens
                </div>
              </div>

              {/* Advanced Search & Multi-criteria Filters */}
              <FilterBar
                filters={filters}
                onFilterChange={setFilters}
                totalResults={filteredProducts.length}
              />

              {/* Product Grid (3-4 columns desktop, 2 tablet, 1-2 mobile) */}
              {filteredProducts.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
                  <Package className="w-12 h-12 mx-auto text-slate-300" />
                  <h3 className="text-base font-bold text-slate-800">Nenhum colecionável encontrado</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Não encontramos itens com os filtros selecionados. Tente ajustar os termos de busca ou categoria.
                  </p>
                  <button
                    onClick={() =>
                      setFilters({
                        searchQuery: '',
                        category: 'all',
                        rarity: 'all',
                        condition: 'all',
                        minPrice: 0,
                        maxPrice: 80000,
                        sortBy: 'featured',
                      })
                    }
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
                  >
                    Limpar Todos os Filtros
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
                  {filteredProducts.map((item) => (
                    <ProductCard
                      key={item.id}
                      item={item}
                      onSelect={(it) => setSelectedProduct(it)}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>
              )}

              {/* PWA Mobile Banner / Recommendation */}
              <div className="mt-12 p-6 rounded-3xl bg-linear-to-r from-slate-900 to-slate-800 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0 text-amber-400">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold">Instale o RelicVault no seu Celular ou Tablet</h4>
                    <p className="text-xs text-slate-300 mt-1 max-w-md">
                      Acesse com rapidez, receba notificações de status de pedidos em tempo real e navegue sem barra de navegador.
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <PWAInstallButton />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tracking View */}
        {currentView === 'tracking' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Rastreamento de Pedidos</h2>
              <p className="text-xs text-slate-500">
                Acompanhe o status de conferência, expedição e entrega dos seus itens colecionáveis
              </p>
            </div>

            <OrderTrackingModal
              isOpen={true}
              onClose={() => setCurrentView('store')}
              orders={orders}
              selectedOrderId={selectedTrackingOrderId}
              onSelectOrder={(id) => setSelectedTrackingOrderId(id)}
            />
          </div>
        )}

        {/* Admin Dashboard View */}
        {currentView === 'admin' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
            <AdminPanel
              products={products}
              orders={orders}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onResetCatalog={handleResetCatalog}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 bg-white border-t border-slate-200/80 text-slate-500 text-xs py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 font-display">RelicVault</span>
            <span>—</span>
            <span>Loja Virtual de Colecionáveis Raros & Moedas</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>PIX Instantâneo</span>
            <span>·</span>
            <span>Cartão em até 12x</span>
            <span>·</span>
            <span>Boleto Bancário</span>
            <span>·</span>
            <span>Sedex com Seguro Total</span>
          </div>
        </div>
      </footer>

      {/* Mobile Touch Ergonomic Bottom Navigation Bar */}
      <BottomTabBar
        currentView={currentView}
        onNavigate={(v) => setCurrentView(v)}
        cartCount={totalCartCount}
        ordersCount={orders.length}
        onOpenCart={() => setIsCartOpen(true)}
        onSearchFocus={scrollToCatalog}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        item={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Checkout Modal with Brazilian Payment Systems */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        onOrderCreated={handleOrderCreated}
      />

      {/* Notifications Drawer */}
      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
        onSelectNotification={handleSelectNotification}
      />
    </div>
  );
}
