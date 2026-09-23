import React, { useState } from 'react';
import { PaymentGatewaysConfig } from '../types';
import { 
  Zap, 
  CreditCard, 
  FileText, 
  Smartphone, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  Percent, 
  KeyRound, 
  Building2, 
  HelpCircle,
  ShieldCheck,
  Check
} from 'lucide-react';

interface PaymentGatewaysEditorProps {
  payments: PaymentGatewaysConfig;
  onSavePayments: (newPayments: PaymentGatewaysConfig) => void;
  onResetPayments: () => void;
}

export const PaymentGatewaysEditor: React.FC<PaymentGatewaysEditorProps> = ({
  payments,
  onSavePayments,
  onResetPayments,
}) => {
  const [data, setData] = useState<PaymentGatewaysConfig>(payments);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSavePayments(data);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleReset = () => {
    if (window.confirm('Deseja restaurar as configurações de pagamento padrão nacionais?')) {
      onResetPayments();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  const availableFlags = ['Visa', 'Mastercard', 'Elo', 'Hipercard', 'American Express'];

  const toggleFlag = (flag: string) => {
    const current = data.creditCard.acceptedFlags;
    if (current.includes(flag)) {
      if (current.length === 1) return; // keep at least one
      setData({
        ...data,
        creditCard: {
          ...data.creditCard,
          acceptedFlags: current.filter((f) => f !== flag)
        }
      });
    } else {
      setData({
        ...data,
        creditCard: {
          ...data.creditCard,
          acceptedFlags: [...current, flag]
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Métodos de Pagamento Nacionais</h3>
          <p className="text-[11px] text-slate-500">
            Habilite, configure taxas, descontos e chaves compatíveis com as principais soluções digitais do Brasil.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {savedSuccess && (
            <span className="text-emerald-700 font-bold text-xs flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Configurações Salvas!</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restaurar Padrão</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer active:scale-98"
          >
            <Save className="w-3.5 h-3.5 text-amber-400" />
            <span>Salvar Regras de Pagamento</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. PIX INSTANTÂNEO */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">PIX Instantâneo (Banco Central)</h4>
                <p className="text-[11px] text-slate-500">Compensação em segundos, QR Code dinâmico e código copia e cola</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={data.pix.enabled}
                onChange={(e) => setData({
                  ...data,
                  pix: { ...data.pix, enabled: e.target.checked }
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {data.pix.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Desconto no PIX (%)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  step="0.5"
                  value={data.pix.discountPercent}
                  onChange={(e) => setData({
                    ...data,
                    pix: { ...data.pix, discountPercent: Number(e.target.value) }
                  })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-bold text-slate-900 font-mono-nums"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Ex: 5% aplica desconto automático sobre o valor do carrinho.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  <span>Tipo de Chave PIX</span>
                </label>
                <select
                  value={data.pix.pixKeyType}
                  onChange={(e) => setData({
                    ...data,
                    pix: { ...data.pix, pixKeyType: e.target.value as any }
                  })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 bg-white"
                >
                  <option value="email">E-mail</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="phone">Celular</option>
                  <option value="random">Chave Aleatória (EVP)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chave PIX da Loja</label>
                <input
                  type="text"
                  value={data.pix.pixKey}
                  onChange={(e) => setData({
                    ...data,
                    pix: { ...data.pix, pixKey: e.target.value }
                  })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-mono text-[11px]"
                  placeholder="contato@relicvault.com.br"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nome do Favorecido / Recebedor</label>
                <input
                  type="text"
                  value={data.pix.recipientName}
                  onChange={(e) => setData({
                    ...data,
                    pix: { ...data.pix, recipientName: e.target.value }
                  })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                  placeholder="RelicVault Pagamentos Digitais"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Instituição Bancária / Gateway PIX</span>
                </label>
                <input
                  type="text"
                  value={data.pix.recipientBank}
                  onChange={(e) => setData({
                    ...data,
                    pix: { ...data.pix, recipientBank: e.target.value }
                  })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                  placeholder="Banco Central / PIX Instantâneo"
                />
              </div>
            </div>
          )}
        </div>

        {/* 2. CARTÃO DE CRÉDITO NACIONAL & PARCELAMENTO */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Cartão de Crédito Nacional & Parcelamento</h4>
                <p className="text-[11px] text-slate-500">Visa, Mastercard, Elo, Hipercard com suporte a parcelas até 12x</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={data.creditCard.enabled}
                onChange={(e) => setData({
                  ...data,
                  creditCard: { ...data.creditCard, enabled: e.target.checked }
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {data.creditCard.enabled && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Gateway de Pagamento Integrado
                  </label>
                  <select
                    value={data.creditCard.gateway}
                    onChange={(e) => setData({
                      ...data,
                      creditCard: { ...data.creditCard, gateway: e.target.value as any }
                    })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 bg-white font-medium"
                  >
                    <option value="mercadopago">Mercado Pago (Recomendado BR)</option>
                    <option value="pagbank">PagBank / PagSeguro</option>
                    <option value="asaas">Asaas Gestão Financeira</option>
                    <option value="cielo">Cielo E-commerce</option>
                    <option value="pagarme">Pagar.me / Stone</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Número Máximo de Parcelas
                  </label>
                  <select
                    value={data.creditCard.maxInstallments}
                    onChange={(e) => setData({
                      ...data,
                      creditCard: { ...data.creditCard, maxInstallments: Number(e.target.value) }
                    })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 bg-white font-medium"
                  >
                    <option value={1}>1x (À vista apenas)</option>
                    <option value={3}>Até 3x</option>
                    <option value={6}>Até 6x</option>
                    <option value={10}>Até 10x</option>
                    <option value={12}>Até 12x</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Parcelamento Sem Juros
                  </label>
                  <select
                    value={data.creditCard.interestFreeInstallments}
                    onChange={(e) => setData({
                      ...data,
                      creditCard: { ...data.creditCard, interestFreeInstallments: Number(e.target.value) }
                    })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 bg-white font-medium"
                  >
                    <option value={1}>1x sem juros</option>
                    <option value={2}>Até 2x sem juros</option>
                    <option value={3}>Até 3x sem juros</option>
                    <option value={6}>Até 6x sem juros</option>
                    <option value={12}>Até 12x sem juros</option>
                  </select>
                </div>
              </div>

              {/* Accepted Card Brands */}
              <div>
                <label className="block font-semibold text-slate-700 mb-2">
                  Bandeiras Nacionais & Internacionais Aceitas
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableFlags.map((flag) => {
                    const active = data.creditCard.acceptedFlags.includes(flag);
                    return (
                      <button
                        key={flag}
                        type="button"
                        onClick={() => toggleFlag(flag)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                          active
                            ? 'bg-blue-50 border-blue-300 text-blue-800'
                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        <Check className={`w-3.5 h-3.5 ${active ? 'text-blue-600' : 'text-slate-300'}`} />
                        <span>{flag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. BOLETO BANCÁRIO */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Boleto Bancário Híbrido</h4>
                <p className="text-[11px] text-slate-500">Linha digitável, código de barras e QR Code PIX integrado</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={data.boleto.enabled}
                onChange={(e) => setData({
                  ...data,
                  boleto: { ...data.boleto, enabled: e.target.checked }
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {data.boleto.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Prazo de Vencimento do Boleto
                </label>
                <select
                  value={data.boleto.dueDays}
                  onChange={(e) => setData({
                    ...data,
                    boleto: { ...data.boleto, dueDays: Number(e.target.value) }
                  })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 bg-white font-medium"
                >
                  <option value={1}>1 dia corrido</option>
                  <option value={2}>2 dias corridos</option>
                  <option value={3}>3 dias corridos (Padrão e-commerce)</option>
                  <option value={5}>5 dias corridos</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Instruções Impressas no Boleto
                </label>
                <input
                  type="text"
                  value={data.boleto.instructions}
                  onChange={(e) => setData({
                    ...data,
                    boleto: { ...data.boleto, instructions: e.target.value }
                  })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                  placeholder="Pagável em qualquer agência bancária ou lotérica..."
                />
              </div>
            </div>
          )}
        </div>

        {/* 4. CARTEIRAS DIGITAIS NACIONAIS */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Carteiras Digitais Nacionais</h4>
                <p className="text-[11px] text-slate-500">Pagamentos com saldo em conta e 1 clique nos principais apps do Brasil</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* PicPay */}
            <label className="p-3 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition">
              <div>
                <span className="font-bold text-slate-800 block">PicPay</span>
                <span className="text-[10px] text-emerald-600 font-medium">Cashback & QR Code</span>
              </div>
              <input
                type="checkbox"
                checked={data.digitalWallets.picpay}
                onChange={(e) => setData({
                  ...data,
                  digitalWallets: { ...data.digitalWallets, picpay: e.target.checked }
                })}
                className="w-4 h-4 text-emerald-600 rounded"
              />
            </label>

            {/* Mercado Pago */}
            <label className="p-3 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition">
              <div>
                <span className="font-bold text-slate-800 block">Mercado Pago</span>
                <span className="text-[10px] text-blue-600 font-medium">Saldo & Cartão MP</span>
              </div>
              <input
                type="checkbox"
                checked={data.digitalWallets.mercadopago}
                onChange={(e) => setData({
                  ...data,
                  digitalWallets: { ...data.digitalWallets, mercadopago: e.target.checked }
                })}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </label>

            {/* NuPay / Nubank */}
            <label className="p-3 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition">
              <div>
                <span className="font-bold text-slate-800 block">NuPay (Nubank)</span>
                <span className="text-[10px] text-purple-600 font-medium">Débito e Crédito Nu</span>
              </div>
              <input
                type="checkbox"
                checked={data.digitalWallets.nupay}
                onChange={(e) => setData({
                  ...data,
                  digitalWallets: { ...data.digitalWallets, nupay: e.target.checked }
                })}
                className="w-4 h-4 text-purple-600 rounded"
              />
            </label>

            {/* Google Pay / Apple Pay */}
            <label className="p-3 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition">
              <div>
                <span className="font-bold text-slate-800 block">Google & Apple Pay</span>
                <span className="text-[10px] text-slate-500 font-medium">NFC / 1-Clique</span>
              </div>
              <input
                type="checkbox"
                checked={data.digitalWallets.googlePay}
                onChange={(e) => setData({
                  ...data,
                  digitalWallets: { ...data.digitalWallets, googlePay: e.target.checked }
                })}
                className="w-4 h-4 text-slate-800 rounded"
              />
            </label>
          </div>
        </div>

        {/* Global Save Action */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {savedSuccess && (
            <span className="text-emerald-700 font-bold text-xs flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Regras de pagamento salvas. O checkout online será ativado quando o gateway PIX estiver configurado.</span>
            </span>
          )}

          <button
            type="submit"
            className="px-6 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-md transition cursor-pointer active:scale-98"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>Salvar Métodos de Pagamento</span>
          </button>
        </div>
      </form>
    </div>
  );
};
