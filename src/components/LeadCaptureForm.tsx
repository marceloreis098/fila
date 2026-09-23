/**
 * RelicVault — Captura de lead ("Avise-me quando chegar")
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BellRing, CheckCircle2, Loader2 } from 'lucide-react';
import { submitLead } from '../utils/api';

interface LeadCaptureFormProps {
  itemName?: string;
  itemId?: string;
  variant?: 'catalog' | 'product';
}

export const LeadCaptureForm: React.FC<LeadCaptureFormProps> = ({
  itemName = '',
  itemId = '',
  variant = 'catalog',
}) => {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const clean = contact.trim();
    if (!name.trim() || !clean) {
      setError('Informe seu nome e um e-mail ou número de WhatsApp.');
      return;
    }
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
    setSending(true);
    const ok = await submitLead({
      name: name.trim(),
      email: isEmail ? clean : '',
      phone: isEmail ? '' : clean.replace(/\D/g, ''),
      itemId: itemId || undefined,
      itemName: itemName || undefined,
      message: isEmail
        ? `Quero ser avisado(a) sobre: ${itemName || 'novidades do acervo'}`
        : `Quero ser avisado(a) sobre: ${itemName || 'novidades do acervo'}`,
    });
    setSending(false);
    if (ok) {
      setDone(true);
    } else {
      setError('Não foi possível enviar agora. Tente novamente em instantes.');
    }
  };

  if (done) {
    return (
      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
        <span>
          Recebemos seu contato! Vamos avisar você assim que {itemName ? 'esta peça' : 'o acervo'} estiver disponível.
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto space-y-2 text-left" noValidate>
      <div className="flex-1 min-w-0">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
          maxLength={120}
          aria-label="Seu nome"
          className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500 text-xs bg-white"
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="E-mail ou WhatsApp"
          maxLength={160}
          aria-label="E-mail ou WhatsApp"
          className="flex-1 h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500 text-xs bg-white min-w-0"
        />
        <button
          type="submit"
          disabled={sending}
          className={`flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg text-xs font-bold transition disabled:opacity-60 cursor-pointer shrink-0 ${
            variant === 'catalog'
              ? 'bg-slate-900 text-white hover:bg-slate-800'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {sending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <BellRing className="w-3.5 h-3.5" />
          )}
          <span>{sending ? 'Enviando...' : 'Quero ser avisado'}</span>
        </button>
      </div>
      {error && <p className="text-[11px] text-rose-600">{error}</p>}
    </form>
  );
};