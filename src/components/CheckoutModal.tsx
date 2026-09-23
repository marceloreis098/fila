import React, { useState, useEffect } from 'react';
import { CartItem, Order, OrderCustomer, StoreSiteSettings } from '../types';
import { 
  formatCurrencyBRL, 
  formatCPF, 
  formatCEP, 
  formatPhone, 
  formatCardNumber, 
  formatCardExpiry,
  detectCardBrand, 
  calculateInstallments, 
  generatePixPayload, 
  generateBoletoData, 
  generateOrderTrackingCode 
} from '../utils/payment';
import { PixQRCode } from './PixQRCode';
import { 
  X, 
  ShieldCheck, 
  CreditCard, 
  Barcode, 
  Zap, 
  Copy, 
  Check, 
  Lock, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  MessageCircle,
  Truck,
  Smartphone
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onOrderCreated: (order: Order) => void;
  settings: StoreSiteSettings;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cart,
  onOrderCreated,
  settings,
}) => {
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'boleto'>('pix');
  
  // Customer state with friendly prefill for smooth user testing
  const [customer, setCustomer] = useState<OrderCustomer>({
    name: 'Roberto Vianna da Silva',
    email: 'roberto.vianna@gmail.com',
    phone: '(21) 98765-4321',
    cpf: '123.456.789-00',
    address: {
      cep: '22041-001',
      street: 'Avenida Atlântica',
      number: '1420',
      complement: 'Apt 142',
      neighborhood: 'Copacabana',
      city: 'Rio de Janeiro',
      state: 'RJ',
    },
  });

  // Credit card state
  const [cardNumber, setCardNumber] = useState('4532 8900 1234 5678');
  const [cardHolder, setCardHolder] = useState('ROBERTO V SILVA');
  const [cardExpiry, setCardExpiry] = useState('11/28');
  const [cardCvv, setCardCvv] = useState('892');
  const [selectedInstallments, setSelectedInstallments] = useState(1);

  // Pix timer state
  const [pixTimeRemaining, setPixTimeRemaining] = useState(900); // 15 mins
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedBoleto, setCopiedBoleto] = useState(false);

  // Success order state
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotal = cart.reduce((acc, curr) => acc + curr.item.price * curr.quantity, 0);
  const shipping = subtotal >= 500 ? 0 : 45;
  const pixDiscountPercent = settings.payments.pix.enabled ? settings.payments.pix.discountPercent : 0;
  const discount = paymentMethod === 'pix' ? subtotal * (pixDiscountPercent / 100) : 0;
  const total = subtotal + shipping - discount;

  const maxInst = settings.payments.creditCard.maxInstallments || 12;
  const freeInst = settings.payments.creditCard.interestFreeInstallments || 3;
  const installmentOptions = calculateInstallments(subtotal + shipping, maxInst, freeInst);
  const detectedBrand = detectCardBrand(cardNumber);

  // Pix countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'payment' && paymentMethod === 'pix' && pixTimeRemaining > 0) {
      timer = setInterval(() => {
        setPixTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, paymentMethod, pixTimeRemaining]);

  if (!isOpen) return null;

  const handleCopyPix = (payload: string) => {
    navigator.clipboard.writeText(payload);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const handleCopyBoleto = (line: string) => {
    navigator.clipboard.writeText(line);
    setCopiedBoleto(true);
    setTimeout(() => setCopiedBoleto(false), 2000);
  };

  const handleCompletePayment = (status: Order['status'] = 'paid') => {
    setIsProcessing(true);

    setTimeout(() => {
      const orderId = `RLV-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date().toISOString();
      const trackingCode = generateOrderTrackingCode();

      const boletoData = generateBoletoData(total, orderId);
      const pixPayload = generatePixPayload(total, orderId);

      const newOrder: Order = {
        id: orderId,
        createdAt: now,
        customer,
        items: cart.map((c) => ({ item: c.item, quantity: c.quantity, unitPrice: c.item.price })),
        subtotal,
        shipping,
        discount,
        total,
        paymentMethod,
        paymentDetails: {
          pixQrCode: pixPayload,
          pixCopyPaste: pixPayload,
          cardLast4: cardNumber.replace(/\s/g, '').slice(-4),
          cardBrand: detectedBrand,
          installments: selectedInstallments,
          installmentAmount: (subtotal + shipping) / selectedInstallments,
          boletoBarcode: boletoData.barcode,
          boletoDigitableLine: boletoData.digitableLine,
          boletoDueDate: boletoData.dueDate,
        },
        status: status,
        trackingCode,
        history: [
          {
            status: 'pending_payment',
            timestamp: now,
            note: 'Pedido registrado com sucesso no sistema RelicVault.',
          },
          ...(status === 'paid'
            ? [
                {
                  status: 'paid' as const,
                  timestamp: new Date(Date.now() + 2000).toISOString(),
                  note: `Pagamento de ${formatCurrencyBRL(total)} confirmado via gateway seguro.`,
                },
              ]
            : []),
        ],
      };

      setCreatedOrder(newOrder);
      setIsProcessing(false);
      setStep('success');
      onOrderCreated(newOrder);
    }, 800);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const pixPayloadPreview = generatePixPayload(total, 'RLV-TEMP');
  const boletoDataPreview = generateBoletoData(total, 'RLV-TEMP');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-white rounded-2xl md:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[94vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step === 'payment' && (
              <button
                onClick={() => setStep('details')}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h3 className="font-bold text-slate-900 text-sm md:text-base">
                {step === 'details' && 'Endereço e Destinatário do Envio'}
                {step === 'payment' && 'Pagamento Seguro do Brasil'}
                {step === 'success' && 'Pedido Concluído com Sucesso!'}
              </h3>
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ambiente Criptografado SSL 256-bit</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1">
          {/* STEP 1: Customer Details */}
          {step === 'details' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-300/40 text-xs text-amber-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Itens colecionáveis são enviados com seguro total e embalagem reforçada.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
                    placeholder="Ex: Carlos de Albuquerque"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">E-mail para Notificações</label>
                  <input
                    type="email"
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
                    placeholder="seuemail@exemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Celular / WhatsApp</label>
                  <input
                    type="text"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: formatPhone(e.target.value) })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">CPF do Titular</label>
                  <input
                    type="text"
                    value={customer.cpf}
                    onChange={(e) => setCustomer({ ...customer, cpf: formatCPF(e.target.value) })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2">
                  Endereço de Entrega
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">CEP</label>
                    <input
                      type="text"
                      value={customer.address.cep}
                      onChange={(e) => setCustomer({
                        ...customer,
                        address: { ...customer.address, cep: formatCEP(e.target.value) }
                      })}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-slate-600 font-medium mb-1">Rua / Logradouro</label>
                    <input
                      type="text"
                      value={customer.address.street}
                      onChange={(e) => setCustomer({
                        ...customer,
                        address: { ...customer.address, street: e.target.value }
                      })}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Número</label>
                    <input
                      type="text"
                      value={customer.address.number}
                      onChange={(e) => setCustomer({
                        ...customer,
                        address: { ...customer.address, number: e.target.value }
                      })}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Bairro</label>
                    <input
                      type="text"
                      value={customer.address.neighborhood}
                      onChange={(e) => setCustomer({
                        ...customer,
                        address: { ...customer.address, neighborhood: e.target.value }
                      })}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Cidade / UF</label>
                    <input
                      type="text"
                      value={`${customer.address.city} - ${customer.address.state}`}
                      readOnly
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-600"
                    />
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500">Total com envio seguro:</span>
                  <div className="text-lg font-bold text-slate-900 font-mono-nums">
                    {formatCurrencyBRL(subtotal + shipping)}
                  </div>
                </div>
                <button
                  onClick={() => setStep('payment')}
                  className="px-6 h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs md:text-sm shadow-md transition"
                >
                  Escolher Meio de Pagamento
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Payment Selection */}
          {step === 'payment' && (
            <div className="space-y-4">
              {/* Payment Method Tabs */}
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setPaymentMethod('pix')}
                  className={`py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    paymentMethod === 'pix'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Zap className="w-4 h-4 text-emerald-600" />
                  <span>PIX {pixDiscountPercent > 0 ? `(${pixDiscountPercent}% OFF)` : ''}</span>
                </button>

                <button
                  onClick={() => setPaymentMethod('credit_card')}
                  className={`py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    paymentMethod === 'credit_card'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-amber-600" />
                  <span>Cartão (Até {maxInst}x)</span>
                </button>

                <button
                  onClick={() => setPaymentMethod('boleto')}
                  className={`py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    paymentMethod === 'boleto'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Barcode className="w-4 h-4 text-slate-600" />
                  <span>Boleto Bancário</span>
                </button>
              </div>

              {/* Digital Wallets Badges Strip */}
              {(settings.payments.digitalWallets.picpay || 
                settings.payments.digitalWallets.mercadopago || 
                settings.payments.digitalWallets.nupay || 
                settings.payments.digitalWallets.googlePay) && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-slate-500">
                  <span className="font-semibold text-slate-600 flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-purple-600" />
                    <span>Carteiras Digitais Nacionais Habilitadas:</span>
                  </span>
                  <div className="flex items-center gap-2 font-medium">
                    {settings.payments.digitalWallets.picpay && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">PicPay</span>
                    )}
                    {settings.payments.digitalWallets.mercadopago && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">Mercado Pago</span>
                    )}
                    {settings.payments.digitalWallets.nupay && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200">NuPay</span>
                    )}
                    {settings.payments.digitalWallets.googlePay && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-300">Google Pay</span>
                    )}
                  </div>
                </div>
              )}

              {/* METHOD 1: PIX */}
              {paymentMethod === 'pix' && (
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-center space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                    <span className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                      <Clock className="w-4 h-4 animate-pulse" />
                      <span>Expira em: <strong className="font-mono-nums">{formatTimer(pixTimeRemaining)}</strong></span>
                    </span>
                    <span className="text-[11px] text-slate-500 truncate max-w-xs">
                      Favorecido: <strong className="text-slate-800">{settings.payments.pix.recipientName}</strong>
                    </span>
                  </div>

                  {/* QR Code */}
                  <div className="flex justify-center">
                    <PixQRCode payload={pixPayloadPreview} size={200} />
                  </div>

                  <div className="text-xs text-slate-600 max-w-sm mx-auto">
                    Abra o app do seu banco, escolha <strong>PIX</strong> e aponte a câmera para o QR Code acima ou use a chave Copia e Cola abaixo.
                  </div>

                  {/* Copy Paste Code */}
                  <div className="flex items-center gap-2 max-w-md mx-auto">
                    <input
                      type="text"
                      readOnly
                      value={pixPayloadPreview}
                      className="flex-1 h-10 px-3 rounded-lg border border-emerald-200 bg-white text-xs font-mono-nums truncate text-slate-700"
                    />
                    <button
                      onClick={() => handleCopyPix(pixPayloadPreview)}
                      className="px-3.5 h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shrink-0"
                    >
                      {copiedPix ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar PIX</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Instant Simulation Action */}
                  <div className="pt-3 border-t border-emerald-200/60 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <div className="text-left text-xs">
                      <span className="text-slate-500">Valor com 5% de desconto:</span>
                      <div className="text-base font-bold text-emerald-800 font-mono-nums">
                        {formatCurrencyBRL(total)}
                      </div>
                    </div>

                    <button
                      onClick={() => handleCompletePayment('paid')}
                      disabled={isProcessing}
                      className="w-full sm:w-auto px-5 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      <span>{isProcessing ? 'Verificando com Banco Central...' : 'Simular Confirmação do PIX'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* METHOD 2: CREDIT CARD */}
              {paymentMethod === 'credit_card' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="md:col-span-2">
                      <label className="block text-slate-700 font-semibold mb-1">
                        Número do Cartão de Crédito
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                          placeholder="0000 0000 0000 0000"
                          className="w-full h-10 pl-3 pr-20 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500 font-mono-nums"
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] uppercase font-bold text-slate-500">
                          {detectedBrand !== 'unknown' && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                              {detectedBrand}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Nome no Cartão</label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Validade</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(formatCardExpiry(e.target.value))}
                          placeholder="MM/AA"
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500 font-mono-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">CVV</label>
                        <input
                          type="text"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.slice(0, 4))}
                          placeholder="123"
                          className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500 font-mono-nums"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-slate-700 font-semibold mb-1">Opções de Parcelamento</label>
                      <select
                        value={selectedInstallments}
                        onChange={(e) => setSelectedInstallments(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
                      >
                        {installmentOptions.map((opt) => (
                          <option key={opt.installments} value={opt.installments}>
                            {opt.installments}x de {formatCurrencyBRL(opt.amount)}{' '}
                            {opt.hasInterest ? `(com juros de 1.99% a.m. - total ${formatCurrencyBRL(opt.total)})` : '(sem juros)'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500">Total a faturar:</span>
                      <div className="text-base font-bold text-slate-900 font-mono-nums">
                        {formatCurrencyBRL(
                          selectedInstallments <= 6
                            ? total
                            : installmentOptions[selectedInstallments - 1].total
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCompletePayment('paid')}
                      disabled={isProcessing}
                      className="px-6 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs md:text-sm shadow-md transition"
                    >
                      {isProcessing ? 'Processando Cartão...' : 'Confirmar Compra no Cartão'}
                    </button>
                  </div>
                </div>
              )}

              {/* METHOD 3: BOLETO BANCÁRIO */}
              {paymentMethod === 'boleto' && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">Vencimento em 3 dias úteis:</span>
                    <span className="font-bold font-mono-nums text-amber-700">{boletoDataPreview.dueDate}</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Linha Digitável do Boleto
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={boletoDataPreview.digitableLine}
                        className="flex-1 h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-[11px] font-mono-nums truncate"
                      />
                      <button
                        onClick={() => handleCopyBoleto(boletoDataPreview.digitableLine)}
                        className="px-3 h-9 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium flex items-center gap-1"
                      >
                        {copiedBoleto ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copiar</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    O boleto pode ser pago em qualquer lotérica ou internet banking até o vencimento. A compensação leva de 24 a 48h úteis.
                  </p>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500">Total do Boleto:</span>
                      <div className="text-base font-bold text-slate-900 font-mono-nums">
                        {formatCurrencyBRL(total)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCompletePayment('pending_payment')}
                      disabled={isProcessing}
                      className="px-6 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs md:text-sm shadow-md transition"
                    >
                      {isProcessing ? 'Gerando Boleto...' : 'Finalizar e Emitir Boleto'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Order Completed / Success */}
          {step === 'success' && createdOrder && (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-md animate-in zoom-in-50">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {createdOrder.status === 'paid' ? 'Pagamento Confirmado!' : 'Pedido Registrado com Sucesso!'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Número do Pedido: <strong className="text-slate-800 font-mono-nums">#{createdOrder.id}</strong>
                </p>
              </div>

              {/* Order quick overview */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Status atual:</span>
                  <span className="font-bold text-emerald-700 uppercase">
                    {createdOrder.status === 'paid' ? 'Pagamento Aprovado' : 'Aguardando Pagamento'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Rastreio Sedex:</span>
                  </span>
                  <span className="font-bold font-mono-nums text-slate-800">
                    {createdOrder.trackingCode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Destinatário:</span>
                  <span className="font-medium text-slate-800">{createdOrder.customer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Endereço:</span>
                  <span className="text-slate-700 truncate max-w-[240px]">
                    {createdOrder.customer.address.street}, {createdOrder.customer.address.number} - {createdOrder.customer.address.city}/{createdOrder.customer.address.state}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-sm">
                  <span>Total Pago:</span>
                  <span className="font-mono-nums text-slate-900">{formatCurrencyBRL(createdOrder.total)}</span>
                </div>
              </div>

              {/* WhatsApp Notification trigger */}
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-800">Receber atualizações deste pedido no WhatsApp?</span>
                    <div className="text-[11px] text-emerald-700 font-mono-nums">SAC RelicVault: (21) 90000-0000</div>
                  </div>
                </div>
                <a
                  href={`https://api.whatsapp.com/send?phone=5521900000000&text=${encodeURIComponent(
                    `Olá! Meu pedido no RelicVault é #${createdOrder.id}. Gostaria de acompanhar o status de envio do rastreio ${createdOrder.trackingCode}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold whitespace-nowrap flex items-center justify-center gap-1 shrink-0 transition"
                >
                  <span>Ativar WhatsApp</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs md:text-sm shadow-md transition"
                >
                  Voltar à Loja & Acompanhar Pedido
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
