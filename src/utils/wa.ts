/**
 * RelicVault — Links de venda via WhatsApp
 * SPDX-License-Identifier: Apache-2.0
 */

import { CollectibleItem, StoreSiteSettings } from '../types';
import { formatCurrencyBRL } from './payment';

export function whatsAppLink(number: string, message: string): string {
  const clean = String(number || '').replace(/\D/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export function productWhatsAppMessage(settings: StoreSiteSettings, item: CollectibleItem): string {
  const lines = [
    `Olá! Tenho interesse no item abaixo do acervo ${settings.storeName}:`,
    ``,
    `📍 *${item.name}*`,
    `🏷️ Franquia: ${item.franchise}`,
    `🏅 Raridade: ${item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}`,
    `📜 Estado: ${item.condition}`,
    `📅 Ano: ${item.year}`,
    `💎 Valor de referência: ${formatCurrencyBRL(item.price)}`,
    `🔎 Código do item: ${item.id}`,
    item.authenticityCert ? `✅ ${item.authenticityCert}` : '',
    ``,
    `Gostaria de saber a disponibilidade e as condições de envio seguro.`,
  ].filter(Boolean);
  return lines.join('\n');
}

export function generalWhatsAppMessage(settings: StoreSiteSettings): string {
  return `Olá! Gostaria de saber mais sobre o acervo da ${settings.storeName}.`;
}