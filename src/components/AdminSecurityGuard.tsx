/**
 * RelicVault — Guarda de Segurança do Master Administrator
 * SPDX-License-Identifier: Apache-2.0
 *
 * Autenticação REAL (server-side):
 *  - Login com e-mail + senha do Master Administrator (validado no servidor)
 *  - MFA TOTP real via aplicativo autenticador (Google Authenticator/Authy)
 *  - Sessão com token assinado HMAC no servidor (nada de segredos no navegador)
 *
 * Nenhuma credencial, código de backup ou chave é exibida nesta tela.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ShieldAlert,
  WifiOff,
  Loader2,
} from 'lucide-react';

interface AdminSecurityGuardProps {
  children: React.ReactNode;
}

interface AdminSession {
  token: string;
  email: string;
  expiresAt: number;
}

interface LoginResponse {
  mfaRequired: boolean;
  pendingToken?: string;
  setupToken?: string;
  setup?: { secret: string; otpauthUri: string; qrDataUrl: string };
}

interface MfaVerifyResponse {
  sessionToken: string;
  email: string;
  expiresAt: number;
}

interface SessionResponse {
  valid: boolean;
  email: string;
  expiresAt: number;
}

interface ApiError extends Error {
  status?: number;
  data?: { error?: string; retryAfter?: number };
}

const SESSION_KEY = 'relicvault_admin_session_v1';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

async function api<T>(path: string, options?: RequestInit, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(path, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
    if (res.status === 204) return undefined as unknown as T;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error((data as { error?: string })?.error || `Falha na requisição (${res.status})`) as ApiError;
      err.status = res.status;
      err.data = data as { error?: string; retryAfter?: number };
      throw err;
    }
    return data as T;
  } catch (e) {
    const err = e as ApiError;
    if (err?.name === 'AbortError') {
      throw new Error('Tempo esgotado ao conectar com o servidor de autenticação.') as ApiError;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const AdminSecurityGuard: React.FC<AdminSecurityGuardProps> = ({ children }) => {
  // Sessão validada no servidor
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState<AdminSession | null>(null);

  // Fluxo de login
  const [loginStep, setLoginStep] = useState<'credentials' | 'setup' | 'mfa'>('credentials');
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [setupInfo, setSetupInfo] = useState<NonNullable<LoginResponse['setup']> | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Estado de segurança
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lockSeconds, setLockSeconds] = useState(0);
  const [serverOnline, setServerOnline] = useState(true);

  // Valida a sessão salva contra o servidor ao montar
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as AdminSession;
          if (parsed?.token && parsed.expiresAt > Date.now()) {
            const info = await api<SessionResponse>('/api/admin/session', {
              headers: { Authorization: `Bearer ${parsed.token}` },
            });
            if (!cancelled && info?.valid) {
              setSession(parsed);
              return;
            }
          }
          sessionStorage.removeItem(SESSION_KEY);
        }
      } catch {
        // sem sessão ou servidor indisponível — mostra o login
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Countdown de bloqueio
  useEffect(() => {
    if (lockSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockSeconds]);

  const handleCredentialsSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMessage(null);
      setSubmitting(true);
      try {
        const data = await api<LoginResponse>('/api/admin/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        if (data?.mfaRequired && data.pendingToken) {
          setPendingToken(data.pendingToken);
          setLoginStep('mfa');
          setMfaCode('');
        } else if (!data?.mfaRequired && data.setupToken && data.setup) {
          // Primeiro acesso: configurar o MFA (QR code do autenticador)
          setPendingToken(data.setupToken);
          setSetupInfo(data.setup);
          setLoginStep('setup');
          setMfaCode('');
        }
      } catch (err) {
        const e = err as ApiError;
        if (e?.status === 429 || e?.status === 401) {
          setErrorMessage(e.message || 'Credenciais inválidas.');
          if (e.data?.retryAfter) setLockSeconds(e.data.retryAfter);
        } else {
          setServerOnline(false);
          setErrorMessage(
            'Não foi possível conectar ao servidor de autenticação. Verifique se o servidor está no ar e tente novamente.'
          );
        }
      } finally {
        setSubmitting(false);
      }
    },
    [email, password]
  );

  const handleSetupConfirm = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMessage(null);
      setSubmitting(true);
      try {
        const data = await api<MfaVerifyResponse>('/api/admin/mfa-setup-confirm', {
          method: 'POST',
          body: JSON.stringify({ token: pendingToken, code: mfaCode }),
        });
        if (data?.sessionToken) {
          const next: AdminSession = { token: data.sessionToken, email: data.email, expiresAt: data.expiresAt };
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
          setSession(next);
        }
      } catch (err) {
        const e = err as ApiError;
        if (e?.status === 429 || e?.status === 401 || e?.status === 400) {
          setErrorMessage(e.message || 'Código inválido.');
        } else {
          setServerOnline(false);
          setErrorMessage(
            'Não foi possível conectar ao servidor de autenticação. Verifique se o servidor está no ar e tente novamente.'
          );
        }
      } finally {
        setSubmitting(false);
      }
    },
    [pendingToken, mfaCode]
  );

  const handleMfaSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMessage(null);
      setSubmitting(true);
      try {
        const data = await api<MfaVerifyResponse>('/api/admin/mfa-verify', {
          method: 'POST',
          body: JSON.stringify({ token: pendingToken, code: mfaCode }),
        });
        if (data?.sessionToken) {
          const next: AdminSession = { token: data.sessionToken, email: data.email, expiresAt: data.expiresAt };
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
          setSession(next);
        }
      } catch (err) {
        const e = err as ApiError;
        if (e?.status === 429 || e?.status === 401) {
          setErrorMessage(e.message || 'Código MFA inválido.');
          if (e.data?.retryAfter) setLockSeconds(e.data.retryAfter);
        } else {
          setServerOnline(false);
          setErrorMessage(
            'Não foi possível conectar ao servidor de autenticação. Verifique se o servidor está no ar e tente novamente.'
          );
        }
      } finally {
        setSubmitting(false);
      }
    },
    [pendingToken, mfaCode]
  );

  const handleLogout = useCallback(async () => {
    if (session) {
      await api('/api/admin/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
      }).catch(() => {});
    }
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
    setLoginStep('credentials');
    setPendingToken(null);
    setSetupInfo(null);
    setEmail('');
    setPassword('');
    setMfaCode('');
    setErrorMessage(null);
    setLockSeconds(0);
    setServerOnline(true);
  }, [session]);

  // Verificando sessão ao entrar no painel
  if (checking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-7 h-7 animate-spin text-amber-600" />
          <span className="text-xs font-semibold">Verificando sessão segura...</span>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------
  // Autenticado — Barra de status + conteúdo protegido
  // ---------------------------------------------------------------
  if (session) {
    return (
      <div className="space-y-4">
        <div className="bg-slate-900 text-white rounded-2xl px-4 py-3 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
                <span>Sessão de Master Administrator</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-mono-nums border border-emerald-800">
                  MFA Verificado
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Autenticado como <strong className="text-slate-200">{session.email}</strong> · sessão de 8 horas
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Encerrar sessão do Master Administrator"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Encerrar Sessão</span>
          </button>
        </div>

        {children}
      </div>
    );
  }

  // ---------------------------------------------------------------
  // Login — E-mail + Senha + MFA TOTP real
  // ---------------------------------------------------------------
  return (
    <div className="min-h-[75vh] flex items-center justify-center py-6 px-3">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="bg-slate-950 text-white p-6 relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight text-white font-display">
                  RelicVault — Master Admin
                </h2>
                <p className="text-[11px] text-slate-400">Acesso restrito ao cofre administrativo</p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-bold text-amber-400 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-amber-400" />
              <span>TOTP Obrigatório</span>
            </span>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-xs">
            <div className={`flex items-center gap-1.5 ${loginStep === 'credentials' ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                loginStep === 'credentials' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}>
                1
              </span>
              <span>Credenciais</span>
            </div>

            <span className="text-slate-600">→</span>

            <div className={`flex items-center gap-1.5 ${loginStep === 'setup' ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                loginStep === 'setup' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}>
                2
              </span>
              <span>Config. MFA</span>
            </div>

            <span className="text-slate-600">→</span>

            <div className={`flex items-center gap-1.5 ${loginStep === 'mfa' ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                loginStep === 'mfa' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}>
                3
              </span>
              <span>MFA TOTP</span>
            </div>
          </div>
        </div>

        {/* Aviso de servidor offline */}
        {!serverOnline && (
          <div className="p-3.5 mx-6 mt-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <WifiOff className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-snug">
              Servidor de autenticação indisponível. Verifique se o <code className="font-mono font-bold">node server.js</code> está rodando.
            </div>
          </div>
        )}

        {/* Erro */}
        {errorMessage && (
          <div className="p-3.5 mx-6 mt-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-snug">{errorMessage}</div>
          </div>
        )}

        {loginStep === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="p-6 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">E-mail do Master Administrator</label>
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu-email@dominio.com.br"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-medium"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700">Senha</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Ocultar' : 'Mostrar'}</span>
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha..."
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-mono-nums"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || lockSeconds > 0}
              className="w-full h-11 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50 cursor-pointer active:scale-98"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              ) : (
                <Lock className="w-4 h-4 text-amber-400" />
              )}
              <span>
                {lockSeconds > 0
                  ? `Bloqueado (${lockSeconds}s)`
                  : submitting
                    ? 'Verificando...'
                    : 'Avançar para MFA'}
              </span>
            </button>

            <p className="text-[10px] text-slate-400 text-center pt-1 leading-relaxed">
              Credenciais definidas pelo administrador do servidor (variáveis de ambiente).
              Nenhuma credencial é armazenada ou exibida no navegador.
            </p>
          </form>
        )}

        {loginStep === 'setup' && setupInfo && (
          <form onSubmit={handleSetupConfirm} className="p-6 space-y-4 text-xs">
            <div className="text-center space-y-1 pb-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center mb-2">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Configurar Autenticador (Primeiro Acesso)</h3>
              <p className="text-slate-500 text-[11px] max-w-sm mx-auto">
                Escaneie o QR code abaixo com o Google Authenticator, Authy ou app compatível. Isso ativa a proteção MFA do painel.
              </p>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white border border-slate-200">
              {setupInfo.qrDataUrl ? (
                <img
                  src={setupInfo.qrDataUrl}
                  alt="QR Code para cadastro no aplicativo autenticador"
                  className="w-44 h-44 rounded-xl border border-slate-100"
                />
              ) : (
                <div className="w-44 h-44 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-[10px]">
                  QR indisponível
                </div>
              )}

              <div className="w-full text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                  Não consegue escanear? Digite a chave manualmente:
                </div>
                <div className="flex items-center justify-center gap-2">
                  <code className="px-2.5 py-1.5 rounded-lg bg-slate-900 text-emerald-300 font-mono font-bold text-[11px] tracking-wider">
                    {setupInfo.secret}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(setupInfo.secret);
                      setCopiedSecret(true);
                      setTimeout(() => setCopiedSecret(false), 2000);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-white font-bold text-[10px] transition cursor-pointer ${
                      copiedSecret ? 'bg-emerald-600' : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  >
                    {copiedSecret ? 'Copiada!' : 'Copiar Chave'}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 text-center">
                Digite o código de 6 dígitos do autenticador para confirmar
              </label>
              <input
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
                className="w-full h-12 text-center text-xl font-bold font-mono-nums tracking-[0.3em] rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-500 bg-slate-50"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50 cursor-pointer active:scale-98"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{submitting ? 'Ativando MFA...' : 'Ativar MFA e Entrar no Painel'}</span>
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setLoginStep('credentials');
                  setSetupInfo(null);
                  setPendingToken(null);
                  setErrorMessage(null);
                }}
                className="text-slate-500 hover:text-slate-800 text-[11px] cursor-pointer"
              >
                ← Voltar para credenciais
              </button>
            </div>
          </form>
        )}

        {loginStep === 'mfa' && (
          <form onSubmit={handleMfaSubmit} className="p-6 space-y-4 text-xs">
            <div className="text-center space-y-1 pb-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center mb-2">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Autenticação em 2 Etapas (TOTP)</h3>
              <p className="text-slate-500 text-[11px] max-w-xs mx-auto">
                Abra seu aplicativo autenticador (Google Authenticator, Authy ou similar) e digite o código de 6 dígitos.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 text-center">Código de 6 Dígitos</label>
              <input
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
                className="w-full h-12 text-center text-xl font-bold font-mono-nums tracking-[0.3em] rounded-xl border border-slate-300 focus:outline-none focus:border-amber-500 bg-slate-50"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || lockSeconds > 0}
              className="w-full h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50 cursor-pointer active:scale-98"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{lockSeconds > 0 ? `Bloqueado (${lockSeconds}s)` : submitting ? 'Validando...' : 'Confirmar MFA e Entrar'}</span>
            </button>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  setLoginStep('credentials');
                  setPendingToken(null);
                  setErrorMessage(null);
                }}
                className="text-slate-500 hover:text-slate-800 text-[11px] cursor-pointer"
              >
                ← Voltar para credenciais
              </button>

              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <KeyRound className="w-3 h-3" />
                Código expira a cada 30s
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};