import React, { useState } from 'react';
import { CollectibleItem, Order, OrderStatus, ItemCategory, ItemRarity, ItemCondition } from '../types';
import { formatCurrencyBRL } from '../utils/payment';
import { ImagePicker } from './ImagePicker';
import { 
  Plus, 
  Minus,
  Package, 
  ShoppingBag, 
  TrendingUp, 
  AlertTriangle, 
  Edit, 
  Trash2, 
  X, 
  Save, 
  Send, 
  RefreshCw, 
  CheckCircle, 
  Truck, 
  Clock, 
  ExternalLink, 
  MessageCircle, 
  Sparkles,
  Award,
  Layers,
  FileText
} from 'lucide-react';

interface AdminPanelProps {
  products: CollectibleItem[];
  orders: Order[];
  onAddProduct: (item: CollectibleItem) => void;
  onUpdateProduct: (item: CollectibleItem) => void;
  onDeleteProduct: (id: string) => void;
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus, trackingCode?: string) => void;
  onResetCatalog: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  products,
  orders,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUpdateOrderStatus,
  onResetCatalog,
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'metrics'>('inventory');
  
  // New product form modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<CollectibleItem>>({
    name: '',
    category: 'tcg',
    rarity: 'raro',
    condition: 'PSA 10 Gem Mint',
    year: 2024,
    price: 1500,
    stock: 2,
    featured: false,
    image: products[0]?.image || '',
    description: '',
    authenticityCert: 'Certificado de Autenticidade Oficial RelicVault #98421',
    franchise: 'Geral',
    specs: [
      { label: 'Estado', value: 'Excelente' },
      { label: 'Preservação', value: 'Cápsula Acrílica' },
    ],
  });

  // Full Edit product state
  const [editingProduct, setEditingProduct] = useState<CollectibleItem | null>(null);

  // Status update message feedback
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Metrics calculations
  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((acc, curr) => acc + curr.total, 0);

  const completedOrders = orders.filter((o) => o.status === 'delivered' || o.status === 'paid' || o.status === 'shipped').length;
  const averageTicket = orders.length > 0 ? totalRevenue / (orders.length || 1) : 0;
  const lowStockItems = products.filter((p) => p.stock > 0 && p.stock <= 2);
  const outOfStockItems = products.filter((p) => p.stock === 0);

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;

    const created: CollectibleItem = {
      id: `RLV-MANUAL-${Math.floor(1000 + Math.random() * 9000)}`,
      name: newProduct.name || 'Item Colecionável',
      category: (newProduct.category as ItemCategory) || 'tcg',
      rarity: (newProduct.rarity as ItemRarity) || 'raro',
      condition: (newProduct.condition as ItemCondition) || 'PSA 10 Gem Mint',
      year: Number(newProduct.year) || 2024,
      price: Number(newProduct.price) || 500,
      stock: Number(newProduct.stock) || 1,
      featured: !!newProduct.featured,
      image: newProduct.image || products[0]?.image || '',
      description: newProduct.description || 'Peça autêntica preservada para colecionadores exigentes.',
      authenticityCert: newProduct.authenticityCert || 'Selo Holográfico de Autenticidade',
      franchise: newProduct.franchise || 'Coleção Especial',
      specs: newProduct.specs || [{ label: 'Conservação', value: 'Pristine' }],
    };

    onAddProduct(created);
    setShowAddModal(false);
    showFeedback('Novo item adicionado com sucesso ao estoque!');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    onUpdateProduct(editingProduct);
    setEditingProduct(null);
    showFeedback(`Item "${editingProduct.name}" atualizado com sucesso!`);
  };

  const handleQuickStockDelta = (item: CollectibleItem, delta: number) => {
    const newStock = Math.max(0, item.stock + delta);
    onUpdateProduct({ ...item, stock: newStock });
    showFeedback(`Estoque de "${item.name}" ajustado para ${newStock} un.`);
  };

  const handleStatusChange = (order: Order, newStatus: OrderStatus) => {
    onUpdateOrderStatus(order.id, newStatus);
    showFeedback(`Status do pedido #${order.id} alterado para "${getStatusLabel(newStatus)}" e notificação automática enviada!`);
  };

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const getStatusLabel = (st: OrderStatus) => {
    switch (st) {
      case 'pending_payment': return 'Aguardando Pagamento';
      case 'paid': return 'Pago / Aprovado';
      case 'in_preparation': return 'Em Separação no Cofre';
      case 'shipped': return 'Postado nos Correios';
      case 'delivered': return 'Entregue';
      case 'cancelled': return 'Cancelado';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast feedback */}
      {feedbackMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium flex items-center gap-2 border border-slate-700 animate-in slide-in-from-top-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Admin Subheader & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>Painel Administrativo RelicVault</span>
          </h2>
          <p className="text-xs text-slate-500">
            Gerenciamento de fotos, estoque, descrições, pedidos e notificações automáticas
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'inventory' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Estoque & Catálogo ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'orders' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Vendas & Pedidos ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'metrics' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Métricas
          </button>
        </div>
      </div>

      {/* TAB 1: INVENTORY & STOCK */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Colecionável</span>
              </button>

              <button
                onClick={onResetCatalog}
                className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                title="Restaura os produtos originais do cofre"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restaurar Catálogo</span>
              </button>
            </div>

            {/* Low stock indicators */}
            {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
              <div className="flex items-center gap-2 text-xs">
                {lowStockItems.length > 0 && (
                  <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <strong>{lowStockItems.length}</strong> estoque baixo (&lt;3 un.)
                  </span>
                )}
                {outOfStockItems.length > 0 && (
                  <span className="text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                    <strong>{outOfStockItems.length}</strong> esgotados
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Item Colecionável</th>
                    <th className="p-3.5">Categoria</th>
                    <th className="p-3.5">Raridade & Condição</th>
                    <th className="p-3.5">Preço (BRL)</th>
                    <th className="p-3.5 text-center">Ajuste de Estoque</th>
                    <th className="p-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-200 shadow-2xs"
                          />
                          <div className="min-w-0 max-w-xs">
                            <div className="font-semibold text-slate-900 leading-snug line-clamp-1">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {item.description}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono-nums mt-0.5">
                              {item.id} · Ano {item.year} {item.featured && '· ★ Vitrine'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 capitalize text-slate-600 font-medium">
                        {item.category}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800 capitalize">{item.rarity}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[140px]">{item.condition}</div>
                      </td>
                      <td className="p-3.5 font-bold font-mono-nums text-slate-900">
                        {formatCurrencyBRL(item.price)}
                      </td>
                      
                      {/* Inline Stock Increment/Decrement for fast updates */}
                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5 border border-slate-200 rounded-lg bg-slate-50 p-1">
                          <button
                            type="button"
                            onClick={() => handleQuickStockDelta(item, -1)}
                            className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-white hover:text-slate-900 transition disabled:opacity-30 cursor-pointer"
                            title="Diminuir 1 un. do estoque"
                            disabled={item.stock <= 0}
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <span
                            className={`px-2 py-0.5 rounded font-bold font-mono-nums text-xs ${
                              item.stock === 0
                                ? 'bg-rose-100 text-rose-800'
                                : item.stock <= 2
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.stock} un.
                          </span>

                          <button
                            type="button"
                            onClick={() => handleQuickStockDelta(item, 1)}
                            className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-white hover:text-slate-900 transition cursor-pointer"
                            title="Adicionar 1 un. ao estoque"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingProduct({ ...item })}
                            className="px-2.5 py-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition flex items-center gap-1.5 font-medium cursor-pointer"
                            title="Editar todas informações, fotos e descrição"
                          >
                            <Edit className="w-3.5 h-3.5 text-amber-600" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => onDeleteProduct(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Excluir item do estoque"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SALES & ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="text-xs text-slate-500">
            Atualize o status dos pedidos para disparar notificações automáticas em tempo real para os colecionadores.
          </div>

          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
                <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-600" />
                <p className="text-sm font-semibold text-slate-700">Nenhum pedido recebido ainda</p>
                <p className="text-xs text-slate-400 mt-1">
                  Faça um pedido na loja para testar o fluxo de vendas e notificações automáticas.
                </p>
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 shadow-xs space-y-3"
                >
                  {/* Order Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 font-mono-nums">
                        #{order.id}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-600 font-medium">
                        {order.customer.name} ({order.customer.phone})
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs text-slate-400">Total Pago</span>
                        <div className="text-sm font-bold font-mono-nums text-slate-900">
                          {formatCurrencyBRL(order.total)}
                        </div>
                      </div>

                      {/* Status Dropdown */}
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order, e.target.value as OrderStatus)}
                        className={`h-9 px-3 rounded-xl text-xs font-bold border cursor-pointer focus:outline-none ${
                          order.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : order.status === 'shipped'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : order.status === 'delivered'
                            ? 'bg-purple-50 text-purple-800 border-purple-300'
                            : order.status === 'cancelled'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        <option value="pending_payment">Aguardando Pagamento</option>
                        <option value="paid">Pagamento Aprovado</option>
                        <option value="in_preparation">Em Separação no Cofre</option>
                        <option value="shipped">Postado nos Correios (Sedex)</option>
                        <option value="delivered">Entregue</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    </div>
                  </div>

                  {/* Items and Address row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
                    <div>
                      <div className="font-semibold text-slate-700 mb-1">Itens do Pedido:</div>
                      <div className="space-y-1">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{it.quantity}x {it.item.name}</span>
                            <span className="font-mono-nums font-semibold">{formatCurrencyBRL(it.unitPrice * it.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="font-semibold text-slate-700">Destino do Envio:</div>
                      <div>{order.customer.address.street}, {order.customer.address.number} - {order.customer.address.neighborhood}</div>
                      <div>{order.customer.address.city} / {order.customer.address.state} - CEP: {order.customer.address.cep}</div>
                      <div className="pt-1 flex items-center gap-2">
                        <span className="font-medium text-slate-800">Rastreio:</span>
                        <code className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono-nums font-bold">
                          {order.trackingCode}
                        </code>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Notification Action Bar */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-[11px] text-slate-400">
                      Método: <strong className="uppercase text-slate-700">{order.paymentMethod}</strong> · Criado em {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                    </span>

                    <a
                      href={`https://api.whatsapp.com/send?phone=${order.customer.phone.replace(/\D/g, '')}&text=${encodeURIComponent(
                        `Olá ${order.customer.name}! Seu pedido #${order.id} no RelicVault está com status: ${getStatusLabel(order.status)}. Código de rastreamento Sedex: ${order.trackingCode}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1.5 transition"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Notificar Cliente via WhatsApp</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: METRICS */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Receita Bruta</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono-nums text-slate-900 mt-2">
                {formatCurrencyBRL(totalRevenue)}
              </div>
              <p className="text-[11px] text-emerald-700 mt-1">Transações aprovadas</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Total de Pedidos</span>
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono-nums text-slate-900 mt-2">
                {orders.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{completedOrders} pedidos em andamento/entregues</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Ticket Médio</span>
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono-nums text-slate-900 mt-2">
                {formatCurrencyBRL(averageTicket)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Média por colecionador</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Estoque Crítico</span>
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono-nums text-slate-900 mt-2">
                {lowStockItems.length + outOfStockItems.length}
              </div>
              <p className="text-[11px] text-rose-600 mt-1">Necessitam reposição no cofre</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD NEW PRODUCT (WITH ADVANCED IMAGE PICKER & FULL SPECS) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl md:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div className="p-4 md:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm md:text-base">Adicionar Novo Colecionável</h3>
                <p className="text-[11px] text-slate-500">Cadastre a peça com fotos em alta resolução e laudo pericial</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-5 md:p-6 overflow-y-auto space-y-4 text-xs">
              {/* IMAGE PICKER (File upload from device/camera, presets, or URL) */}
              <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200">
                <ImagePicker
                  currentImage={newProduct.image || ''}
                  onImageSelected={(url) => setNewProduct({ ...newProduct, image: url })}
                  label="1. Foto Oficial do Colecionável"
                />
              </div>

              {/* Title & Franchise */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Nome do Colecionável *</label>
                  <input
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="Ex: Pikachu Illustrator Promo Card"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Franquia / Linha</label>
                  <input
                    type="text"
                    value={newProduct.franchise}
                    onChange={(e) => setNewProduct({ ...newProduct, franchise: e.target.value })}
                    placeholder="Ex: Pokémon TCG, Star Wars..."
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Category & Rarity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Categoria</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value as ItemCategory })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500 bg-white cursor-pointer"
                  >
                    <option value="tcg">Cartas TCG</option>
                    <option value="figures">Estátuas & Figures</option>
                    <option value="coins">Moedas Históricas</option>
                    <option value="retro">Retrogames</option>
                    <option value="comics">Quadrinhos Clássicos</option>
                    <option value="vinyl">Vinis Históricos</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Grau de Raridade</label>
                  <select
                    value={newProduct.rarity}
                    onChange={(e) => setNewProduct({ ...newProduct, rarity: e.target.value as ItemRarity })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500 bg-white cursor-pointer font-medium"
                  >
                    <option value="graal">Santo Graal (Altíssimo Valor)</option>
                    <option value="mitico">Mítico</option>
                    <option value="lendario">Lendário</option>
                    <option value="epico">Épico</option>
                    <option value="raro">Raro</option>
                    <option value="comum">Comum</option>
                  </select>
                </div>
              </div>

              {/* Price, Stock, Year */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Preço à vista (R$) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500 font-mono-nums font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unidades em Estoque *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500 font-mono-nums"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ano de Lançamento</label>
                  <input
                    type="number"
                    value={newProduct.year}
                    onChange={(e) => setNewProduct({ ...newProduct, year: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500 font-mono-nums"
                  />
                </div>
              </div>

              {/* Condition & Certificate */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Condição / Graduação Pericial</label>
                  <input
                    type="text"
                    value={newProduct.condition}
                    onChange={(e) => setNewProduct({ ...newProduct, condition: e.target.value as ItemCondition })}
                    placeholder="Ex: PSA 10 Gem Mint / BGS 9.5"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Certificado de Autenticidade</label>
                  <input
                    type="text"
                    value={newProduct.authenticityCert}
                    onChange={(e) => setNewProduct({ ...newProduct, authenticityCert: e.target.value })}
                    placeholder="Ex: Certificado Oficial RelicVault #8942"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Detailed Description */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">Descrição Completa da Peça</label>
                  <span className="text-[10px] text-slate-400">
                    {(newProduct.description || '').length} caracteres
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  placeholder="Descreva a história, relevância histórica, procedência, detalhes do encarte/cápsula e estado físico de preservação..."
                  className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500 leading-relaxed text-xs"
                />
              </div>

              {/* Featured Checkbox */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="add-featured"
                  checked={!!newProduct.featured}
                  onChange={(e) => setNewProduct({ ...newProduct, featured: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="add-featured" className="text-xs font-medium text-slate-800 cursor-pointer">
                  Destacar este item na vitrine principal da página inicial
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs cursor-pointer active:scale-95 transition"
                >
                  Cadastrar no Estoque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: COMPLETE ITEM EDITOR (NAME, DESCRIPTION, IMAGE, SPECS, PRICE & STOCK) */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl md:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div className="p-4 md:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
                  <Edit className="w-4 h-4 text-amber-600" />
                  <span>Editar Colecionável: {editingProduct.name}</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Modifique a foto, descrição, preço, estoque e informações periciais
                </p>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 md:p-6 overflow-y-auto space-y-4 text-xs">
              {/* IMAGE PICKER: CHANGE PHOTO */}
              <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200">
                <ImagePicker
                  currentImage={editingProduct.image}
                  onImageSelected={(url) => setEditingProduct({ ...editingProduct, image: url })}
                  label="Foto do Colecionável (Upload, Galeria ou Link)"
                />
              </div>

              {/* Title & Franchise */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Nome do Colecionável</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Franquia</label>
                  <input
                    type="text"
                    value={editingProduct.franchise}
                    onChange={(e) => setEditingProduct({ ...editingProduct, franchise: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Category & Rarity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Categoria</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value as ItemCategory })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500 bg-white cursor-pointer"
                  >
                    <option value="tcg">Cartas TCG</option>
                    <option value="figures">Estátuas & Figures</option>
                    <option value="coins">Moedas Históricas</option>
                    <option value="retro">Retrogames</option>
                    <option value="comics">Quadrinhos Clássicos</option>
                    <option value="vinyl">Vinis Históricos</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Raridade</label>
                  <select
                    value={editingProduct.rarity}
                    onChange={(e) => setEditingProduct({ ...editingProduct, rarity: e.target.value as ItemRarity })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500 bg-white cursor-pointer font-medium"
                  >
                    <option value="graal">Santo Graal</option>
                    <option value="mitico">Mítico</option>
                    <option value="lendario">Lendário</option>
                    <option value="epico">Épico</option>
                    <option value="raro">Raro</option>
                    <option value="comum">Comum</option>
                  </select>
                </div>
              </div>

              {/* Price, Stock, Year */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Preço (R$)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500 font-mono-nums font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estoque Disponível</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingProduct.stock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500 font-mono-nums"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ano</label>
                  <input
                    type="number"
                    value={editingProduct.year}
                    onChange={(e) => setEditingProduct({ ...editingProduct, year: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500 font-mono-nums"
                  />
                </div>
              </div>

              {/* Condition & Certificate */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Condição / Graduação</label>
                  <input
                    type="text"
                    value={editingProduct.condition}
                    onChange={(e) => setEditingProduct({ ...editingProduct, condition: e.target.value as ItemCondition })}
                    placeholder="Ex: PSA 10 Gem Mint / Caixa Selada"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Certificado de Autenticidade</label>
                  <input
                    type="text"
                    value={editingProduct.authenticityCert}
                    onChange={(e) => setEditingProduct({ ...editingProduct, authenticityCert: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* EDIT DESCRIPTION */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">Descrição do Item</label>
                  <span className="text-[10px] text-slate-400">
                    {editingProduct.description.length} caracteres
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  placeholder="História, procedência, detalhes do encarte e estado de conservação..."
                  className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500 leading-relaxed text-xs"
                />
              </div>

              {/* Featured Checkbox */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="edit-featured"
                  checked={editingProduct.featured}
                  onChange={(e) => setEditingProduct({ ...editingProduct, featured: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="edit-featured" className="text-xs font-medium text-slate-800 cursor-pointer">
                  Exibir na vitrine de destaques da página inicial
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Todas Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
