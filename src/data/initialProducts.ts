import { CollectibleItem } from '../types';

import heroImg from '../assets/images/hero_collectibles_vault_1790174435354.jpg';

export const HERO_IMAGE = heroImg;

/**
 * Catálogo inicial VAZIO — sem itens de demonstração.
 * Os produtos entram exclusivamente pelo painel do Master Administrator
 * (AdminPanel). A loja funciona como vitrine até que produtos reais
 * sejam cadastrados e um gateway de pagamento seja integrado.
 */
export const INITIAL_PRODUCTS: CollectibleItem[] = [];