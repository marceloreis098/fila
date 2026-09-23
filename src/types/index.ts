export type ItemCategory = 'tcg' | 'figures' | 'coins' | 'retro' | 'comics' | 'vinyl';

export type ItemRarity = 'comum' | 'raro' | 'epico' | 'lendario' | 'mitico' | 'graal';

export type ItemCondition = 
  | 'PSA 10 Gem Mint' 
  | 'BGS 9.5 Mint' 
  | 'Mint in Box (MIB)' 
  | 'Near Mint (NM)' 
  | 'Excelente / Peça Histórica' 
  | 'Primeira Prensagem Original';

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
