import { StoreSiteSettings } from '../types';
import { HERO_IMAGE } from './initialProducts';

export const DEFAULT_SITE_SETTINGS: StoreSiteSettings = {
  storeName: 'RelicVault',
  storeTagline: 'Loja Virtual de Colecionáveis Raros & Moedas',
  topBar: {
    announcementText: '🛡️ Envio Blindado Sedex com Seguro Total para todo o Brasil | PIX com 5% de Desconto',
    badgeText: 'Cofre Oficial',
  },
  hero: {
    tagText: 'Cofre Oficial de Itens Raros do Brasil',
    title: 'Colecionáveis lendários com autenticidade certificada.',
    subtitle: 'Curadoria especializada em cartas TCG raras, estátuas numeradas, moedas imperiais e retrogames lacrados. Pagamento instantâneo no PIX com 5% de desconto e parcelamento em até 12x.',
    badge1Title: 'Garantia Oficial',
    badge1Sub: 'Certificado RelicVault',
    badge2Title: 'PIX Instantâneo',
    badge2Sub: '5% OFF à vista',
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
    address: 'Av. Rio Branco, 156 - Centro, Rio de Janeiro - RJ',
    cnpj: '48.291.048/0001-92',
    companyName: 'RelicVault Colecionáveis & Numismática do Brasil Ltda.',
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
};
