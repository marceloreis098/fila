import { StoreSiteSettings } from '../types';
import { HERO_IMAGE } from './initialProducts';
import { FALLBACK_CATEGORIES } from '../utils/catalog';

export const DEFAULT_SITE_SETTINGS: StoreSiteSettings = {
  storeName: 'RelicVault',
  storeTagline: 'Loja Virtual de Colecionáveis Raros & Moedas',
  topBar: {
    announcementText: '🛡️ Envio Blindado Sedex com Seguro Total para todo o Brasil',
    badgeText: 'Cofre Oficial',
  },
  hero: {
    tagText: 'Cofre Oficial de Itens Raros do Brasil',
    title: 'Colecionáveis lendários com autenticidade certificada.',
    subtitle: 'Curadoria especializada em cartas TCG raras, estátuas numeradas, moedas imperiais e retrogames lacrados. Autenticidade certificada em cada peça.',
    badge1Title: 'Garantia Oficial',
    badge1Sub: 'Certificado RelicVault',
    badge2Title: 'Curadoria Exclusiva',
    badge2Sub: 'Peças raras autenticadas',
    badge3Title: 'Envio Blindado',
    badge3Sub: 'Seguro total Sedex',
    heroImageUrl: HERO_IMAGE,
  },
  contacts: {
    phone: '(21) 90000-0000',
    phoneRaw: '21900000000',
    whatsapp: '(21) 90000-0000',
    whatsappNumber: '5521900000000',
    email: 'sac@relicvault.com.br',
    supportHours: 'Segunda a Sexta, das 09h às 19h',
    address: '',
    cnpj: '',
    companyName: '',
  },
  payments: {
    pix: {
      enabled: true,
      discountPercent: 5,
      pixKey: 'contato@relicvault.com.br',
      pixKeyType: 'email',
      recipientName: 'RelicVault Pagamentos Digitais',
      recipientBank: 'Banco Central / PIX Instantâneo',
    },
    creditCard: {
      enabled: true,
      maxInstallments: 12,
      interestFreeInstallments: 3,
      gateway: 'mercadopago',
      acceptedFlags: ['Visa', 'Mastercard', 'Elo', 'Hipercard', 'American Express'],
    },
    boleto: {
      enabled: true,
      dueDays: 3,
      discountPercent: 0,
      instructions: 'Pagável em qualquer agência bancária, internet banking ou casas lotéricas até a data de vencimento.',
    },
    digitalWallets: {
      picpay: true,
      mercadopago: true,
      nupay: true,
      googlePay: true,
    },
  },
  categories: FALLBACK_CATEGORIES,
};
