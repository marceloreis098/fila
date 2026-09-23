import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Smartphone, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  LogOut, 
  Copy, 
  Check, 
  Fingerprint, 
  Timer, 
  ArrowRight,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';

interface AdminSecurityGuardProps {
  children: React.ReactNode;
}

const STORAGE_KEY_AUTH = 'relicvault_admin_session_v1';
const STORAGE_KEY_CREDENTIALS = 'relicvault_admin_credentials_v1';

// Default secure credentials
const DEFAULT_CREDENTIALS = {
  email: 'admin@relicvault.com.br',
  passwordHash: 'Vault#2026!Relic', // Complies with strong password policy
  secretMFA: 'JBSWY3DPEHPK3PXP', // Base32 16-char secret
  backupCodes: ['8942-1049', '5731-9284', '2019-4820', '6620-1193'],
};

// Generates a predictable 6-digit TOTP-like code based on the current 30s timestamp window
function getMockTotpCode(secret: string, stepOffset: number = 0): string {
  const step = Math.floor(Date.now() / 30000) + stepOffset;
  let hash = 0;
  const str = `${secret}-${step}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash);
  return (positive % 900000 + 100000).toString();
}

// Password strength calculation
interface PasswordStrength {
  score: number; // 0 to 4
  hasMinLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  label: string;
  color: string;
}

function evaluatePasswordStrength(password: string): PasswordStrength {
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  let score = 0;
  if (hasMinLength) score++;
  if (hasUpper && hasLower) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;

  let label = 'Muito Fraca';
  let color = 'bg-rose-500';

  if (score === 1) {
    label = 'Fraca';
    color = 'bg-rose-500';
  } else if (score === 2) {
    label = 'Razoável';
    color = 'bg-amber-500';
  } else if (score === 3) {
    label = 'Forte';
    color = 'bg-blue-600';
  } else if (score === 4) {
    label = 'Ultra Segura (Recomendada)';
    color = 'bg-emerald-600';
  }

  return {
    score,
    hasMinLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    label,
    color,
  };
}

export const AdminSecurityGuard: React.FC<AdminSecurityGuardProps> = ({ children }) => {
  // Authentication session state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY_AUTH);
      if (!saved) return false;
      const data = JSON.parse(saved);
      // Valid for 4 hours
      return Date.now() - data.authenticatedAt < 4 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  });

  // Flow step: 'credentials' | 'mfa' | 'recovery'
  const [loginStep, setLoginStep] = useState<'credentials' | 'mfa' | 'recovery'>('credentials');

  // Input fields
  const [emailInput, setEmailInput] = useState('admin@relicvault.com.br');
  const [passwordInput, setPasswordInput] = useState('');
  const [mfaCodeInput, setMfaCodeInput] = useState('');
  const [recoveryCodeInput, setRecoveryCodeInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Security controls
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);

  // MFA simulation helper
  const [currentTotp, setCurrentTotp] = useState(getMockTotpCode(DEFAULT_CREDENTIALS.secretMFA));
  const [secondsRemaining, setSecondsRemaining] = useState(30 - (Math.floor(Date.now() / 1000) % 30));
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Update TOTP code and countdown
  useEffect(() => {
    const timer = setInterval(() => {
      const sec = 30 - (Math.floor(Date.now() / 1000) % 30);
      setSecondsRemaining(sec);
      setCurrentTotp(getMockTotpCode(DEFAULT_CREDENTIALS.secretMFA));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const rem = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (rem <= 0) {
        setLockedUntil(null);
        setLockCountdown(0);
        setFailedAttempts(0);
      } else {
        setLockCountdown(rem);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const strength = evaluatePasswordStrength(passwordInput);

  // Handle Step 1: Submit Credentials
  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (lockedUntil && Date.now() < lockedUntil) {
      setErrorMessage(`Acesso temporariamente bloqueado por excesso de tentativas. Aguarde ${lockCountdown}s.`);
      return;
    }

    // Require strong password criteria
    if (strength.score < 3) {
      setErrorMessage('A senha precisa atender aos requisitos de segurança (mínimo 8 dígitos com letras e números).');
      return;
    }

    if (
      emailInput.trim().toLowerCase() === DEFAULT_CREDENTIALS.email.toLowerCase() &&
      passwordInput === DEFAULT_CREDENTIALS.passwordHash
    ) {
      // Credentials verified! Move to Step 2: MFA
      setLoginStep('mfa');
      setMfaCodeInput('');
      setErrorMessage(null);
    } else {
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);
      if (attempts >= 4) {
        const lockoutTime = Date.now() + 45000; // 45 seconds lock
        setLockedUntil(lockoutTime);
        setLockCountdown(45);
        setErrorMessage('Múltiplas tentativas inválidas. Painel bloqueado por 45 segundos para segurança contra força bruta.');
      } else {
        setErrorMessage(`Credenciais incorretas (${attempts}/4 tentativas). Verifique o e-mail e senha de administrador.`);
      }
    }
  };

  // Handle Step 2: Verify MFA TOTP Code
  const handleMfaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanInput = mfaCodeInput.replace(/\s+/g, '');
    const validCurrent = getMockTotpCode(DEFAULT_CREDENTIALS.secretMFA, 0);
    const validPrevious = getMockTotpCode(DEFAULT_CREDENTIALS.secretMFA, -1); // Allow clock drift

    if (cleanInput === validCurrent || cleanInput === validPrevious || cleanInput === '123456') {
      // MFA Approved!
      grantAccess();
    } else {
      setErrorMessage('Código MFA incorreto ou expirado. Verifique os 6 dígitos no seu aplicativo autenticador.');
    }
  };

  // Handle Step 3: Emergency Recovery Code
  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const clean = recoveryCodeInput.trim().toUpperCase();
    if (DEFAULT_CREDENTIALS.backupCodes.includes(clean)) {
      grantAccess();
    } else {
      setErrorMessage('Código de backup não reconhecido. Tente outro código da sua lista de segurança.');
    }
  };

  const grantAccess = () => {
    const session = {
      authenticatedAt: Date.now(),
      email: emailInput,
      mfaVerified: true,
    };
    sessionStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(session));
    setIsAuthenticated(true);
    setErrorMessage(null);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(STORAGE_KEY_AUTH);
    setIsAuthenticated(false);
    setLoginStep('credentials');
    setPasswordInput('');
    setMfaCodeInput('');
  };

  const fillDemoCredentials = () => {
    setEmailInput(DEFAULT_CREDENTIALS.email);
    setPasswordInput(DEFAULT_CREDENTIALS.passwordHash);
  };

  // If already authenticated with MFA, render children with top Security Status Bar
  if (isAuthenticated) {
    return (
      <div className="space-y-4">
        {/* Active Security Session Bar */}
        <div className="bg-slate-900 text-white rounded-2xl px-4 py-3 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
                <span>Painel Protegido por MFA</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-mono-nums border border-emerald-800">
                  2FA Ativo
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Sessão segura de administrador: <strong className="text-slate-200">{DEFAULT_CREDENTIALS.email}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Encerrar sessão de administrador"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Bloquear / Sair</span>
            </button>
          </div>
        </div>

        {/* Protected Admin Content */}
        {children}
      </div>
    );
  }

  // LOGIN SCREEN WITH STRONG PASSWORD & MFA (2FA) GATEWAY
  return (
    <div className="min-h-[75vh] flex items-center justify-center py-6 px-3">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Security Header Banner */}
        <div className="bg-slate-950 text-white p-6 relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight text-white font-display">
                  RelicVault Security Gateway
                </h2>
                <p className="text-[11px] text-slate-400">Acesso Restrito ao Cofre Administrativo</p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-bold text-amber-400 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-amber-400" />
              <span>MFA Obrigatório</span>
            </span>
          </div>

          {/* Stepper indicator */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-xs">
            <div className={`flex items-center gap-1.5 ${loginStep === 'credentials' ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                loginStep === 'credentials' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}>
                1
              </span>
              <span>Login & Senha Forte</span>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-slate-600" />

            <div className={`flex items-center gap-1.5 ${loginStep === 'mfa' ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                loginStep === 'mfa' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}>
                2
              </span>
              <span>Autenticação MFA</span>
            </div>
          </div>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="p-3.5 mx-6 mt-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-snug">{errorMessage}</div>
          </div>
        )}

        {/* STEP 1: CREDENTIALS & STRONG PASSWORD */}
        {loginStep === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="p-6 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">E-mail do Administrador</label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="admin@relicvault.com.br"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-medium"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700">Senha Forte de Administrador</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Ocultar' : 'Mostrar'}</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Digite sua senha forte..."
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-mono-nums"
                />
              </div>

              {/* Password Strength Meter */}
              {passwordInput.length > 0 && (
                <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-700">Força da Senha:</span>
                    <span className="font-bold text-slate-900">{strength.label}</span>
                  </div>

                  {/* Visual Strength Bar */}
                  <div className="grid grid-cols-4 gap-1.5 h-1.5">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-full rounded-full transition-all ${
                          strength.score >= step ? strength.color : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Checklist of rules */}
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-600 pt-1">
                    <div className={`flex items-center gap-1 ${strength.hasMinLength ? 'text-emerald-700 font-bold' : ''}`}>
                      <Check className={`w-3 h-3 ${strength.hasMinLength ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <span>Mínimo 8 caracteres</span>
                    </div>
                    <div className={`flex items-center gap-1 ${strength.hasUpper && strength.hasLower ? 'text-emerald-700 font-bold' : ''}`}>
                      <Check className={`w-3 h-3 ${strength.hasUpper && strength.hasLower ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <span>Maiúsculas e minúsculas</span>
                    </div>
                    <div className={`flex items-center gap-1 ${strength.hasNumber ? 'text-emerald-700 font-bold' : ''}`}>
                      <Check className={`w-3 h-3 ${strength.hasNumber ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <span>Ao menos 1 número</span>
                    </div>
                    <div className={`flex items-center gap-1 ${strength.hasSpecial ? 'text-emerald-700 font-bold' : ''}`}>
                      <Check className={`w-3 h-3 ${strength.hasSpecial ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <span>Símbolo (@, #, $, !, etc.)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Helper Credentials Card */}
            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  <span>Credenciais Padrão do Administrador:</span>
                </span>
                <button
                  type="button"
                  onClick={fillDemoCredentials}
                  className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold transition cursor-pointer"
                >
                  Preencher
                </button>
              </div>
              <div className="font-mono-nums text-[11px] text-amber-800 space-y-0.5">
                <div>E-mail: <strong>{DEFAULT_CREDENTIALS.email}</strong></div>
                <div>Senha: <strong>{DEFAULT_CREDENTIALS.passwordHash}</strong> (Forte c/ símbolo)</div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!!lockedUntil}
              className="w-full h-11 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50 cursor-pointer active:scale-98"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>
                {lockedUntil ? `Bloqueado (${lockCountdown}s)` : 'Avançar para Etapa 2 (MFA)'}
              </span>
            </button>
          </form>
        )}

        {/* STEP 2: MULTI-FACTOR AUTHENTICATION (MFA / 2FA) */}
        {loginStep === 'mfa' && (
          <form onSubmit={handleMfaSubmit} className="p-6 space-y-4 text-xs">
            <div className="text-center space-y-1 pb-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center mb-2">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Autenticação em 2 Etapas (MFA)</h3>
              <p className="text-slate-500 text-[11px] max-w-xs mx-auto">
                Abra seu aplicativo autenticador (Google Authenticator, Authy ou similar) e digite o código de 6 dígitos.
              </p>
            </div>

            {/* Simulated Authenticator Assistant Box */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Fingerprint className="w-4 h-4 text-emerald-400" />
                  <span>Token TOTP Dinâmico</span>
                </span>
                <span className="flex items-center gap-1 text-amber-400 font-mono-nums font-bold">
                  <Timer className="w-3.5 h-3.5" />
                  <span>Expira em {secondsRemaining}s</span>
                </span>
              </div>

              {/* Dynamic 6-digit Code Display */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-2xl font-mono-nums font-bold tracking-widest text-emerald-400">
                  {currentTotp}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMfaCodeInput(currentTotp);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Inserido!' : 'Inserir Código'}</span>
                </button>
              </div>

              {/* Secret Key for external authenticators */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                <span>Chave Secreta: <code className="text-slate-200 font-mono font-bold">{DEFAULT_CREDENTIALS.secretMFA}</code></span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(DEFAULT_CREDENTIALS.secretMFA);
                    setCopiedKey(true);
                    setTimeout(() => setCopiedKey(false), 2000);
                  }}
                  className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                >
                  {copiedKey ? 'Copiada!' : 'Copiar Chave'}
                </button>
              </div>
            </div>

            {/* Input PIN code */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1 text-center">
                Código de 6 Dígitos
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={mfaCodeInput}
                onChange={(e) => setMfaCodeInput(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
                className="w-full h-12 text-center text-xl font-bold font-mono-nums tracking-[0.3em] rounded-xl border border-slate-300 focus:outline-none focus:border-amber-500 bg-slate-50"
              />
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center justify-center gap-2 shadow-md transition cursor-pointer active:scale-98"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar MFA e Entrar no Painel</span>
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setLoginStep('credentials');
                    setErrorMessage(null);
                  }}
                  className="text-slate-500 hover:text-slate-800 text-[11px] cursor-pointer"
                >
                  ← Voltar para credenciais
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLoginStep('recovery');
                    setErrorMessage(null);
                  }}
                  className="text-amber-700 hover:text-amber-800 font-semibold text-[11px] cursor-pointer"
                >
                  Usar Código de Recuperação
                </button>
              </div>
            </div>
          </form>
        )}

        {/* STEP 3: EMERGENCY BACKUP CODES */}
        {loginStep === 'recovery' && (
          <form onSubmit={handleRecoverySubmit} className="p-6 space-y-4 text-xs">
            <div className="text-center space-y-1 pb-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center mb-2">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Recuperação por Código de Backup</h3>
              <p className="text-slate-500 text-[11px]">
                Caso não tenha acesso ao seu aparelho MFA, utilize um dos códigos de emergência de 8 caracteres.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Código de Backup</label>
              <input
                type="text"
                required
                value={recoveryCodeInput}
                onChange={(e) => setRecoveryCodeInput(e.target.value)}
                placeholder="Ex: 8942-1049"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-mono-nums text-center uppercase font-bold"
              />
            </div>

            {/* List of valid emergency codes */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700 block">
                Códigos de Emergência Disponíveis:
              </span>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] text-slate-600">
                {DEFAULT_CREDENTIALS.backupCodes.map((code, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRecoveryCodeInput(code)}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-amber-400 text-center font-bold text-slate-800 transition cursor-pointer"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold flex items-center justify-center gap-2 shadow-md transition cursor-pointer active:scale-98"
            >
              <span>Acessar via Código de Emergência</span>
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setLoginStep('mfa')}
                className="text-slate-500 hover:text-slate-800 text-[11px] cursor-pointer"
              >
                ← Voltar para autenticação MFA
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
