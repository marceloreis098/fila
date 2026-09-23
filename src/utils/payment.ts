export function formatCurrencyBRL(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val);
}

export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  const parts = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join(' ');
}

export function formatCardExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function detectCardBrand(number: string): 'visa' | 'mastercard' | 'elo' | 'hipercard' | 'amex' | 'unknown' {
  const clean = number.replace(/\D/g, '');
  if (/^4/.test(clean)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'mastercard';
  if (/^(4011|4389|4514|4576|5041|5066|5090|6277|6362|6363)/.test(clean)) return 'elo';
  if (/^(606282|3841)/.test(clean)) return 'hipercard';
  if (/^3[47]/.test(clean)) return 'amex';
  return 'unknown';
}

export interface InstallmentOption {
  installments: number;
  amount: number;
  total: number;
  hasInterest: boolean;
  interestRate: number;
}

export function calculateInstallments(
  total: number,
  maxInstallments: number = 12,
  interestFreeInstallments: number = 6
): InstallmentOption[] {
  const options: InstallmentOption[] = [];
  const max = Math.max(1, Math.min(24, maxInstallments));
  for (let i = 1; i <= max; i++) {
    if (i <= interestFreeInstallments) {
      options.push({
        installments: i,
        amount: total / i,
        total: total,
        hasInterest: false,
        interestRate: 0,
      });
    } else {
      // 1.99% a.m. a partir das parcelas com juros
      const rate = 0.0199;
      const compoundFactor = Math.pow(1 + rate, i);
      const installmentAmount = (total * rate * compoundFactor) / (compoundFactor - 1);
      options.push({
        installments: i,
        amount: installmentAmount,
        total: installmentAmount * i,
        hasInterest: true,
        interestRate: 1.99,
      });
    }
  }
  return options;
}

// Generates valid-structured Pix Copia e Cola BR Code string
export function generatePixPayload(amount: number, txid: string): string {
  const formattedAmount = amount.toFixed(2);
  // Pix standard payload composition
  const key = 'pagamentos@relicvault.com.br';
  const name = 'RELICVAULT COLECIONAVEIS';
  const city = 'SAO PAULO';
  
  return `00020126580014br.gov.bcb.pix0127${key}520400005303986540${formattedAmount.length}${formattedAmount}5802BR59${name.length}${name}60${city.length}${city}62070503${txid}6304`;
}

// Generates formatted Boleto digitable line
export function generateBoletoData(amount: number, orderId: string) {
  const now = new Date();
  now.setDate(now.getDate() + 3);
  const dueDateStr = now.toLocaleDateString('pt-BR');
  
  const bank = '341'; // Itaú / Bradesco simulation
  const numAmount = Math.round(amount * 100).toString().padStart(10, '0');
  const cleanId = orderId.replace(/\D/g, '').padEnd(8, '4');
  
  const field1 = `${bank}91.79001`;
  const field2 = `01043.${cleanId.slice(0, 5)}`;
  const field3 = `${cleanId.slice(5, 8)}20.150008`;
  const field4 = `5`;
  const field5 = `9999${numAmount}`;
  
  const digitableLine = `${field1} ${field2} ${field3} ${field4} ${field5}`;
  
  return {
    digitableLine,
    dueDate: dueDateStr,
    barcode: `341959999${numAmount}17900101043${cleanId}2015000`,
  };
}

export function generateOrderTrackingCode(): string {
  const letters = 'BR';
  const randomNum = Math.floor(100000000 + Math.random() * 900000000);
  return `${letters}${randomNum}BR`;
}
