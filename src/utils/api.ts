/**
 * RelicVault — Cliente de API (loja pública + painel admin)
 * SPDX-License-Identifier: Apache-2.0
 */

import { CollectibleItem, StoreSiteSettings } from '../types';

const SESSION_KEY = 'relicvault_admin_session_v1';

export function getAdminToken(): string | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.token === 'string' ? parsed.token : null;
  } catch {
    return null;
  }
}

async function request<T>(path: string, init?: RequestInit, timeoutMs = 10000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(path, { ...init, signal: controller.signal });
    if (res.status === 204) return undefined as unknown as T;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(
        (data as { error?: string })?.error || `Falha na requisição (${res.status})`
      ) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

function adminHeaders(): Record<string, string> {
  const token = getAdminToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ---------------------------------------------------------------------------
// Públicas (loja)
// ---------------------------------------------------------------------------
export async function fetchStoreProducts(): Promise<CollectibleItem[] | null> {
  try {
    const data = await request<{ products: CollectibleItem[] }>('/api/products');
    return Array.isArray(data?.products) ? data.products : null;
  } catch {
    return null;
  }
}

export async function fetchStoreSettings(): Promise<StoreSiteSettings | null> {
  try {
    const data = await request<{ settings: StoreSiteSettings | null }>('/api/settings');
    return data?.settings || null;
  } catch {
    return null;
  }
}

export interface LeadPayload {
  name: string;
  email?: string;
  phone?: string;
  itemId?: string;
  itemName?: string;
  message?: string;
}

export async function submitLead(payload: LeadPayload): Promise<boolean> {
  try {
    await request<{ ok: boolean }>('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Administrativas (exigem sessão)
// ---------------------------------------------------------------------------
export async function adminSaveProduct(item: CollectibleItem): Promise<void> {
  await request('/api/admin/products', {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ item }),
  });
}

export async function adminDeleteProduct(id: string): Promise<void> {
  await request(`/api/admin/products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  });
}

export async function adminSaveSettings(settings: StoreSiteSettings): Promise<void> {
  await request('/api/admin/settings', {
    method: 'PUT',
    headers: adminHeaders(),
    body: JSON.stringify({ settings }),
  });
}

export async function adminUpdateOrderStatus(orderId: string, status: string, trackingCode?: string): Promise<void> {
  await request(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    headers: adminHeaders(),
    body: JSON.stringify({ status, trackingCode }),
  });
}

export async function adminMigrate(payload: {
  products: CollectibleItem[];
  settings: StoreSiteSettings;
}): Promise<boolean> {
  try {
    await request<{ ok: boolean }>('/api/admin/migrate', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify(payload),
    });
    return true;
  } catch {
    return false;
  }
}