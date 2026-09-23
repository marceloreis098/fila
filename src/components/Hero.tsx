import React from 'react';
import { HERO_IMAGE } from '../data/initialProducts';
import { ShieldCheck, Zap, Sparkles, ArrowRight, Lock } from 'lucide-react';

interface HeroProps {
  onExplore: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExplore }) => {
  return (
    <section className="relative bg-white border-b border-slate-200/80 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Editorial Content */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Cofre Oficial de Itens Raros do Brasil</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 leading-[1.15] text-balance">
              Colecionáveis lendários com autenticidade certificada.
            </h1>

            <p className="text-sm md:text-base text-slate-600 max-w-xl leading-relaxed">
              Curadoria especializada em cartas TCG graduadas, estátuas numeradas, moedas imperiais e retrogames lacrados. Pagamento instantâneo no PIX com 5% de desconto e parcelamento em até 12x.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onExplore}
                className="px-6 h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs md:text-sm shadow-md transition active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <span>Explorar Catálogo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Claim-to-Proof Adjacency */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900">Perícia & Laudo</div>
                  <div className="text-[11px] text-slate-500">PSA, BGS e CGC</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900">PIX Instantâneo</div>
                  <div className="text-[11px] text-slate-500">5% OFF à vista</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900">Envio Blindado</div>
                  <div className="text-[11px] text-slate-500">Sedex com seguro</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Image Visual Showcase */}
          <div className="lg:col-span-5 relative">
            <div className="relative aspect-16/10 rounded-2xl md:rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 bg-slate-100">
              <img
                src={HERO_IMAGE}
                alt="Cofre de Colecionáveis Raros RelicVault"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-5">
                <div className="text-white">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-amber-300">
                    Acervo Exclusivo 2026
                  </div>
                  <div className="text-sm md:text-base font-bold">
                    Peças históricas preservadas em ambiente protegido
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
