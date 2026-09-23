export type ItemCategory = 'tcg' | 'figures' | 'coins' | 'retro' | 'comics' | 'vinyl';

export type ItemRarity = 'comum' | 'raro' | 'epico' | 'lendario' | 'mitico' | 'graal';

export type ItemCondition = 
  | 'Estado Impecável (Imaculado)' 
  | 'Caixa Selada de Fábrica' 
  | 'Mint in Box (MIB)' 
  | 'Near Mint (NM)' 
  | 'Excelente / Peça Histórica' 
  | 'Primeira Prensagem Original'
  | string;

export interface CollectibleItem {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: ItemRarity;
  condition: ItemCondition;
  year: number;
  price: number;
  originalPrice?: number;
  stock: number;
  featured: boolean;
  image: string;
  description: string;
  authenticityCert: string;
  franchise: string;
  specs: { label: string; value: string }[];
}

export interface CartItem {
  item: CollectibleItem;
  quantity: number;
}

export type OrderStatus = 
  | 'pending_payment' 
  | 'paid' 
  | 'in_preparation' 
  | 'shipped' 
  | 'delivered' 
  | 'cancelled';

export interface OrderCustomer {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  address: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
}

export interface OrderHistoryEntry {
  status: OrderStatus;
  timestamp: string;
  note: string;
}

export interface OrderPaymentDetails {
  pixQrCode?: string;
  pixCopyPaste?: string;
  cardLast4?: string;
  cardBrand?: string;
  installments?: number;
  installmentAmount?: number;
  boletoBarcode?: string;
  boletoDigitableLine?: string;
  boletoDueDate?: string;
}

export interface Order {
  id: string;
  createdAt: string;
  customer: OrderCustomer;
  items: { item: CollectibleItem; quantity: number; unitPrice: number }[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  paymentMethod: 'pix' | 'credit_card' | 'boleto';
  paymentDetails: OrderPaymentDetails;
  status: OrderStatus;
  trackingCode: string;
  history: OrderHistoryEntry[];
}

export interface AppNotification {
  id: string;
  orderId?: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'payment' | 'order' | 'shipping' | 'stock' | 'system';
  read: boolean;
}

export interface FilterState {
  searchQuery: string;
  category: ItemCategory | 'all';
  rarity: ItemRarity | 'all';
  condition: string | 'all';
  minPrice: number;
  maxPrice: number;
  sortBy: 'featured' | 'price_asc' | 'price_desc' | 'rarity' | 'newest';
}

export interface StoreContactConfig {
  phone: string;
  phoneRaw: string;
  whatsapp: string;
  whatsappNumber: string;
  email: string;
  supportHours: string;
  address: string;
  cnpj: string;
  companyName: string;
}

export interface StoreHeroConfig {
  tagText: string;
  title: string;
  subtitle: string;
  badge1Title: string;
  badge1Sub: string;
  badge2Title: string;
  badge2Sub: string;
  badge3Title: string;
  badge3Sub: string;
  heroImageUrl: string;
}

export interface StoreTopBarConfig {
  announcementText: string;
  badgeText: string;
}

export interface PaymentGatewaysConfig {
  pix: {
    enabled: boolean;
    discountPercent: number;
    pixKey: string;
    pixKeyType: 'email' | 'cnpj' | 'phone' | 'random';
    recipientName: string;
    recipientBank: string;
  };
  creditCard: {
    enabled: boolean;
    maxInstallments: number;
    interestFreeInstallments: number;
    gateway: 'mercadopago' | 'pagbank' | 'asaas' | 'cielo' | 'pagarme';
    acceptedFlags: string[];
  };
  boleto: {
    enabled: boolean;
    dueDays: number;
    discountPercent: number;
    instructions: string;
  };
  digitalWallets: {
    picpay: boolean;
    mercadopago: boolean;
    nupay: boolean;
    googlePay: boolean;
  };
}

export interface StoreSiteSettings {
  storeName: string;
  storeTagline: string;
  topBar: StoreTopBarConfig;
  hero: StoreHeroConfig;
  contacts: StoreContactConfig;
  payments: PaymentGatewaysConfig;
}

