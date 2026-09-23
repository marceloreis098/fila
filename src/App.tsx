/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CollectibleItem, 
  Order, 
  OrderStatus, 
  AppNotification, 
  FilterState,
  StoreSiteSettings
} from './types';
import { INITIAL_PRODUCTS } from './data/initialProducts';
import { DEFAULT_SITE_SETTINGS } from './data/defaultSettings';
import { Header } from './components/Header';
import { BottomTabBar } from './components/BottomTabBar';
import { Hero } from './components/Hero';
import { FilterBar } from './components/FilterBar';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { NotificationCenter } from './components/NotificationCenter';
import { AdminPanel } from './components/AdminPanel';
import { AdminSecurityGuard } from './components/AdminSecurityGuard';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { LeadCaptureForm } from './components/LeadCaptureForm';
import {
  fetchStoreProducts,
  fetchStoreSettings,
  adminSaveProduct,
  adminDeleteProduct,
  adminSaveSettings,
  adminUpdateOrderStatus,
  adminMigrate,
} from './utils/api';
import { productWhatsAppMessage, whatsAppLink } from './utils/wa';
import {
  Package,
  Bell,
  Smartphone,
  Phone,
  MessageCircle,
  ShieldCheck,
  Search,
  Truck,
} from 'lucide-react';

const STORAGE_KEYS = {
  PRODUCTS: 'relicvault_products_v2',
  ORDERS: 'relicvault_orders_v1',
  NOTIFICATIONS: 'relicvault_notifications_v1',
  SETTINGS: 'relicvault_settings_v1',
};

const sanitizeCollectibleItem = (item: CollectibleItem): CollectibleItem => {
  const clean = (str: string = '') =>
    str
      .replace(/PSA\s*10\s*Gem\s*Mint/gi, 'Estado Impecável (Imaculado)')
      .replace(/PSA\s*Gem\s*Mint\s*10/gi, 'Estado Impecável')
      .replace(/BGS\s*9\.5\s*Mint/gi, 'Caixa Selada / Impecável')
      .replace(/PSA/gi, 'RelicVault')
      .replace(/BGS/gi, 'RelicVault')
      .replace(/CGC/gi, 'RelicVault')
      .replace(/laudo\s*pericial/gi, 'certificado de autenticidade')
      .replace(/laudo/gi, 'certificado')
      .replace(/perícia\s*independente/gi, 'avaliação criteriosa')
      .replace(/perícia/gi, 'avaliação');

  return {
    ...item,
    condition: clean(item.condition),
    description: clean(item.description),
    authenticityCert: clean(item.authenticityCert),
    specs: (item.specs || []).map((s) => ({
      label: clean(s.label),
      value: clean(s.value),
    })),
  };
};

export default function App() {
  // Navigation View
  const [currentView, setCurrentView] = useState<'store' | 'admin' | 'tracking'>('store');

  // Products state (persisted)
  const [products, setProducts] = useState<CollectibleItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (saved) {
        const parsed: CollectibleItem[] = JSON.parse(saved);
        return parsed.map(sanitizeCollectibleItem);
      }
    } catch {
      // fallback
    }
    return INITIAL_PRODUCTS;
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
        message: 'Explore nosso catálogo de itens colecionáveis autênticos com curadoria exclusiva e certificação de originalidade.',
        timestamp: new Date().toISOString(),
        type: 'system',
        read: false,
      },
    ];
  });

  // Site settings state (persisted)
  const [settings, setSettings] = useState<StoreSiteSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return DEFAULT_SITE_SETTINGS;
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

  // Carrega produtos e configurações do servidor (SQLite) quando disponível;
  // mantém o localStorage como fallback/cache para uso offline.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [serverProducts, serverSettings] = await Promise.all([
        fetchStoreProducts(),
        fetchStoreSettings(),
      ]);
      if (cancelled) return;

      if (serverProducts && serverProducts.length >= 0) {
        setProducts((prev) => {
          const prevIds = new Set(prev.map((p) => p.id));
          const merged = [...serverProducts];
          // preserva itens locais (admin sem servidor/offline) que ainda não foram salvos
          for (const p of prev) {
            if (!merged.some((m) => m.id === p.id)) merged.push(p);
          }
          return merged.map(sanitizeCollectibleItem);
        });
      }

      if (serverSettings && typeof serverSettings === 'object') {
        setSettings((prev) => ({ ...DEFAULT_SITE_SETTINGS, ...serverSettings }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleSaveSettings = (newSettings: StoreSiteSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
    } catch (e) {
      console.error(e);
    }
    adminSaveSettings(newSettings).catch(() => {
      /* sem sessão/servidor — mantém no localStorage */
    });
    pushNotification(
      'Configurações Salvas',
      'As alterações do site foram aplicadas com sucesso.',
      'system'
    );
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_SITE_SETTINGS);
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SITE_SETTINGS));
    } catch (e) {
      console.error(e);
    }
    pushNotification(
      'Padrão Restaurado',
      'Textos e contatos foram redefinidos para os valores originais.',
      'system'
    );
  };

  // Order created handler — removed: checkout/compra desativada (vitrine até gateway real)

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

    // Sincroniza status no servidor (SQLite) — notificações continuam no cliente
    const tracking = orders.find((o) => o.id === orderId)?.trackingCode;
    adminUpdateOrderStatus(orderId, newStatus, tracking).catch(() => {
      /* servidor indisponível — status permanece local */
    });

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

  // Admin Product updates (persistidos no servidor + cache local)
  const handleAddProduct = (item: CollectibleItem) => {
    setProducts((prev) => [item, ...prev]);
    adminSaveProduct(item).catch(() => {
      /* sem sessão/servidor — item fica apenas local */
    });
    pushNotification(
      'Novo Item no Cofre',
      `O item "${item.name}" foi catalogado e adicionado ao estoque da loja.`,
      'stock'
    );
  };

  const handleUpdateProduct = (item: CollectibleItem) => {
    setProducts((prev) => prev.map((p) => (p.id === item.id ? item : p)));
    adminSaveProduct(item).catch(() => {
      /* sem sessão/servidor — item fica apenas local */
    });
  };

  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    adminDeleteProduct(id).catch(() => {
      /* sem sessão/servidor — item fica apenas local */
    });
  };

  const handleResetCatalog = () => {
    setProducts(INITIAL_PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    pushNotification('Catálogo Restaurado', 'O catálogo retornou ao estado inicial (sem itens de demonstração).', 'system');
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

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const scrollToCatalog = () => {
    catalogRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-slate-900 pb-20 md:pb-12">
      {/* Offline Alert Indicator */}
      <OfflineIndicator />

      {/* Floating WhatsApp Button */}
      <a
        href={whatsAppLink(
          settings.contacts.whatsappNumber,
          `Olá! Quero falar com o atendimento da ${settings.storeName}.`
        )}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar com a loja no WhatsApp"
        className="fixed bottom-20 md:bottom-6 right-4 z-40 w-13 h-13 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl flex items-center justify-center transition active:scale-95"
      >
        <MessageCircle className="w-6 h-6" />
      </a>

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
        unreadNotificationsCount={unreadNotifCount}
        onOpenNotifications={() => setIsNotificationCenterOpen(true)}
        onSearchFocus={scrollToCatalog}
        settings={settings}
      />

      {/* MAIN VIEWPORT CONTENT */}
      <main className="flex-1">
        {currentView === 'store' && (
          <div>
            {/* Hero Showcase */}
            <Hero onExplore={scrollToCatalog} settings={settings} />

            {/* Catalog Section */}
            <div ref={catalogRef} className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-6">
              {/* Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                    Acervo do Cofre
                  </h2>
                  <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                    Curadoria exclusiva de itens raros com certificação de autenticidade
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
              {products.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-4">
                  <Package className="w-12 h-12 mx-auto text-slate-300" />
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-slate-800">Catálogo em preparação</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Nosso cofre está sendo abastecido com novas relíquias. Em breve você encontrará aqui
                      itens exclusivos com curadoria e certificação de autenticidade.
                    </p>
                  </div>
                  <LeadCaptureForm variant="catalog" />
                  <div className="pt-1">
                    <a
                      href={whatsAppLink(settings.contacts.whatsappNumber, `Olá! Quero saber quando o acervo da ${settings.storeName} estiver disponível.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition active:scale-95"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Falar com o atendimento no WhatsApp
                    </a>
                  </div>
                </div>
              ) : filteredProducts.length === 0 ? (
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
                      settings={settings}
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

              {/* Como funciona a compra — venda por atendimento */}
              <div className="mt-12">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold tracking-tight text-slate-900">
                    Como funciona a compra
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Atendimento personalizado com curadoria e envio protegido em todo o Brasil
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { icon: Search, title: '1. Escolha a peça', text: 'Navegue pelo acervo e selecione o colecionável do seu interesse.' },
                    { icon: MessageCircle, title: '2. Fale com o atendimento', text: 'Toque em "Comprar" e envie sua mensagem no WhatsApp com o item já preenchido.' },
                    { icon: ShieldCheck, title: '3. Autenticidade conferida', text: 'Conferimos a peça, a certificação e as condições de envio blindado com seguro total Sedex.' },
                    { icon: Truck, title: '4. Receba em casa', text: 'Enviamos com código de rastreamento e você acompanha a entrega pelo app.' },
                  ].map((step) => (
                    <div key={step.title} className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-center">
                      <div className="w-11 h-11 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center mx-auto mb-3">
                        <step.icon className="w-5 h-5" />
                      </div>
                      <div className="text-sm font-bold text-slate-900">{step.title}</div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{step.text}</p>
                    </div>
                  ))}
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
              settings={settings}
            />
          </div>
        )}

        {/* Admin Dashboard View with Strong Password & MFA Gateway */}
        {currentView === 'admin' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
            <AdminSecurityGuard>
              <AdminPanel
                products={products}
                orders={orders}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                onResetCatalog={handleResetCatalog}
                settings={settings}
                onSaveSettings={handleSaveSettings}
                onResetSettings={handleResetSettings}
              />
            </AdminSecurityGuard>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 bg-white border-t border-slate-200/80 text-slate-500 text-xs py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-900 font-display">{settings.storeName}</span>
                <span>—</span>
                <span className="font-medium text-slate-700">{settings.storeTagline}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 max-w-md leading-relaxed">
                Autenticidade garantida com certificado exclusivo, envio blindado com seguro total Sedex para todo o território nacional.
              </p>
              <div className="text-[10px] text-slate-400 mt-2 space-y-0.5">
                <div>CNPJ: <span className="font-mono-nums">{settings.contacts.cnpj}</span> · {settings.contacts.companyName}</div>
                <div>{settings.contacts.address}</div>
              </div>
            </div>

            {/* Direct Contact & Support Box */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Central de Atendimento & SAC
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <a
                    href={`tel:${settings.contacts.phoneRaw || '21900000000'}`}
                    className="text-sm font-bold text-slate-900 hover:text-amber-700 transition font-mono-nums flex items-center gap-1.5"
                    title="Ligar para o SAC"
                  >
                    <Phone className="w-3.5 h-3.5 text-amber-600" />
                    <span>{settings.contacts.phone}</span>
                  </a>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {settings.contacts.supportHours}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {settings.contacts.email}
                </div>
              </div>

              <a
                href={`https://wa.me/${settings.contacts.whatsappNumber || '5521900000000'}?text=${encodeURIComponent(
                  `Olá! Gostaria de falar com o atendimento da ${settings.storeName}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Chamar no WhatsApp</span>
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
            <div>
              © 2026 {settings.storeName}. Todos os direitos reservados. SAC: {settings.contacts.phone}.
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-slate-500">
              <span>Sedex com Seguro Total para todo o Brasil</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Touch Ergonomic Bottom Navigation Bar */}
      <BottomTabBar
        currentView={currentView}
        onNavigate={(v) => setCurrentView(v)}
        ordersCount={orders.length}
        onSearchFocus={scrollToCatalog}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        item={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        settings={settings}
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
