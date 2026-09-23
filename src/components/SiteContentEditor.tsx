import React, { useState } from 'react';
import { StoreSiteSettings } from '../types';
import { 
  Type, 
  Image as ImageIcon, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  FileText, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  Eye, 
  Sparkles,
  MessageCircle,
  HelpCircle,
  Megaphone,
  ShieldCheck
} from 'lucide-react';
import { HERO_IMAGE } from '../data/initialProducts';

interface SiteContentEditorProps {
  settings: StoreSiteSettings;
  onSaveSettings: (newSettings: StoreSiteSettings) => void;
  onResetSettings: () => void;
}

export const SiteContentEditor: React.FC<SiteContentEditorProps> = ({
  settings,
  onSaveSettings,
  onResetSettings,
}) => {
  const [formData, setFormData] = useState<StoreSiteSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'hero' | 'contacts' | 'branding'>('hero');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleReset = () => {
    if (window.confirm('Deseja restaurar todos os textos, imagens e contatos para o padrão original da loja?')) {
      onResetSettings();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  // Preset sample high quality images
  const sampleHeroImages = [
    { label: 'Cofre Original', url: HERO_IMAGE },
    { 
      label: 'Colecionáveis Museu', 
      url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1200&q=80' 
    },
    { 
      label: 'Retro Game & Geek', 
      url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80' 
    },
    { 
      label: 'Numismática Ouro', 
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80' 
    }
  ];

  return (
    <div className="space-y-6">
      {/* Sub-tab Switcher & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('hero')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSubTab === 'hero'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Banner Principal & Dizeres</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('contacts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSubTab === 'contacts'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Telefones, WhatsApp & SAC</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('branding')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
              activeSubTab === 'branding'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Barra de Avisos & Marca</span>
          </button>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {savedSuccess && (
            <span className="text-emerald-700 font-bold text-xs flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Alterações Salvas!</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Restaurar padrão"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restaurar Padrão</span>
          </button>

          <button
            onClick={handleSave}
            type="button"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer active:scale-98"
          >
            <Save className="w-3.5 h-3.5 text-amber-400" />
            <span>Salvar no Site</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SUB-TAB 1: HERO & DIZERES PRINCIPAIS */}
        {activeSubTab === 'hero' && (
          <div className="space-y-6">
            {/* Live Preview Header Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white border border-slate-800 shadow-md">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-2">
                <Eye className="w-4 h-4" />
                <span>Pré-visualização do Banner em Tempo Real:</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-2">
                <div className="md:col-span-8 space-y-2">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/30">
                    {formData.hero.tagText}
                  </span>
                  <h3 className="text-xl md:text-2xl font-bold font-display text-white leading-tight">
                    {formData.hero.title}
                  </h3>
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {formData.hero.subtitle}
                  </p>
                </div>
                <div className="md:col-span-4">
                  <div className="w-full h-24 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-inner">
                    <img 
                      src={formData.hero.heroImageUrl || HERO_IMAGE} 
                      alt="Banner Preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = HERO_IMAGE;
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Inputs for Hero Banner */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Textos do Banner Principal (Hero)</h4>
                  <p className="text-[11px] text-slate-500">Altere o título de boas-vindas, a chamada e o selo principal</p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tag / Selo de Destaque Superior
                  </label>
                  <input
                    type="text"
                    value={formData.hero.tagText}
                    onChange={(e) => setFormData({
                      ...formData,
                      hero: { ...formData.hero, tagText: e.target.value }
                    })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-medium"
                    placeholder="Ex: Cofre Oficial de Itens Raros do Brasil"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Título Principal de Impacto (H1)
                  </label>
                  <input
                    type="text"
                    value={formData.hero.title}
                    onChange={(e) => setFormData({
                      ...formData,
                      hero: { ...formData.hero, title: e.target.value }
                    })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-bold text-slate-900"
                    placeholder="Ex: Colecionáveis lendários com autenticidade certificada."
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Dizeres / Descrição Curatorial (Subtítulo)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.hero.subtitle}
                    onChange={(e) => setFormData({
                      ...formData,
                      hero: { ...formData.hero, subtitle: e.target.value }
                    })}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 text-slate-700 leading-relaxed"
                    placeholder="Descreva a missão ou diferenciais da loja..."
                  />
                </div>

                {/* Hero Image Changer */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Foto do Banner Principal (URL da Imagem)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={formData.hero.heroImageUrl}
                      onChange={(e) => setFormData({
                        ...formData,
                        hero: { ...formData.hero, heroImageUrl: e.target.value }
                      })}
                      className="flex-1 h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-mono text-[11px]"
                      placeholder="https://exemplo.com/imagem-banner.jpg"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        hero: { ...formData.hero, heroImageUrl: HERO_IMAGE }
                      })}
                      className="px-3 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold whitespace-nowrap cursor-pointer"
                    >
                      Padrão do Cofre
                    </button>
                  </div>

                  {/* Preset Quick Select */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-slate-500">Imagens Rápidas:</span>
                    {sampleHeroImages.map((sample, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          hero: { ...formData.hero, heroImageUrl: sample.url }
                        })}
                        className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-amber-50 hover:text-amber-800 border border-slate-200 text-[10px] font-medium transition cursor-pointer"
                      >
                        {sample.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Badges of Confidence */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="font-bold text-slate-900 text-sm">3 Selos de Confiança (Abaixo do Banner)</h4>
                <p className="text-[11px] text-slate-500">Personalize os 3 pilares exibidos para os compradores</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Badge 1 */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>Selo 1 (Garantia)</span>
                  </span>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Título</label>
                    <input
                      type="text"
                      value={formData.hero.badge1Title}
                      onChange={(e) => setFormData({
                        ...formData,
                        hero: { ...formData.hero, badge1Title: e.target.value }
                      })}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Subtítulo</label>
                    <input
                      type="text"
                      value={formData.hero.badge1Sub}
                      onChange={(e) => setFormData({
                        ...formData,
                        hero: { ...formData.hero, badge1Sub: e.target.value }
                      })}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>

                {/* Badge 2 */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Selo 2 (Pagamento)</span>
                  </span>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Título</label>
                    <input
                      type="text"
                      value={formData.hero.badge2Title}
                      onChange={(e) => setFormData({
                        ...formData,
                        hero: { ...formData.hero, badge2Title: e.target.value }
                      })}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Subtítulo</label>
                    <input
                      type="text"
                      value={formData.hero.badge2Sub}
                      onChange={(e) => setFormData({
                        ...formData,
                        hero: { ...formData.hero, badge2Sub: e.target.value }
                      })}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>

                {/* Badge 3 */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Selo 3 (Envio)</span>
                  </span>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Título</label>
                    <input
                      type="text"
                      value={formData.hero.badge3Title}
                      onChange={(e) => setFormData({
                        ...formData,
                        hero: { ...formData.hero, badge3Title: e.target.value }
                      })}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Subtítulo</label>
                    <input
                      type="text"
                      value={formData.hero.badge3Sub}
                      onChange={(e) => setFormData({
                        ...formData,
                        hero: { ...formData.hero, badge3Sub: e.target.value }
                      })}
                      className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 2: TELEFONES, WHATSAPP E SAC */}
        {activeSubTab === 'contacts' && (
          <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm">Canais de Contato & SAC Oficial</h4>
              <p className="text-[11px] text-slate-500">
                Estes dados são atualizados automaticamente no cabeçalho, rodapé, modal de rastreio e confirmação de pedidos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Telefone */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-600" />
                  <span>Telefone Principal de Atendimento</span>
                </label>
                <input
                  type="text"
                  value={formData.contacts.phone}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setFormData({
                      ...formData,
                      contacts: { ...formData.contacts, phone: e.target.value, phoneRaw: raw }
                    });
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-mono-nums font-semibold"
                  placeholder="(21) 90000-0000"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Aparece na barra superior e no rodapé para discagem direta (tel:).
                </span>
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp Oficial</span>
                </label>
                <input
                  type="text"
                  value={formData.contacts.whatsapp}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    const full = raw.startsWith('55') ? raw : `55${raw}`;
                    setFormData({
                      ...formData,
                      contacts: { 
                        ...formData.contacts, 
                        whatsapp: e.target.value, 
                        whatsappNumber: full 
                      }
                    });
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-mono-nums font-semibold"
                  placeholder="(21) 90000-0000"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Link de redirecionamento gerado: wa.me/{formData.contacts.whatsappNumber}
                </span>
              </div>

              {/* Email */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>E-mail de Atendimento ao Cliente</span>
                </label>
                <input
                  type="email"
                  value={formData.contacts.email}
                  onChange={(e) => setFormData({
                    ...formData,
                    contacts: { ...formData.contacts, email: e.target.value }
                  })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-medium"
                  placeholder="sac@relicvault.com.br"
                />
              </div>

              {/* Horário */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-600" />
                  <span>Horário de Funcionamento do SAC</span>
                </label>
                <input
                  type="text"
                  value={formData.contacts.supportHours}
                  onChange={(e) => setFormData({
                    ...formData,
                    contacts: { ...formData.contacts, supportHours: e.target.value }
                  })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                  placeholder="Segunda a Sexta, das 09h às 19h"
                />
              </div>

              {/* Endereço */}
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-600" />
                  <span>Endereço Comercial / Sede</span>
                </label>
                <input
                  type="text"
                  value={formData.contacts.address}
                  onChange={(e) => setFormData({
                    ...formData,
                    contacts: { ...formData.contacts, address: e.target.value }
                  })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                  placeholder="Av. Rio Branco, 156 - Centro, Rio de Janeiro - RJ"
                />
              </div>

              {/* CNPJ & Razão Social */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                  <span>CNPJ da Loja</span>
                </label>
                <input
                  type="text"
                  value={formData.contacts.cnpj}
                  onChange={(e) => setFormData({
                    ...formData,
                    contacts: { ...formData.contacts, cnpj: e.target.value }
                  })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-mono-nums"
                  placeholder="48.291.048/0001-92"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Razão Social / Nome Jurídico
                </label>
                <input
                  type="text"
                  value={formData.contacts.companyName}
                  onChange={(e) => setFormData({
                    ...formData,
                    contacts: { ...formData.contacts, companyName: e.target.value }
                  })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                  placeholder="RelicVault Colecionáveis & Numismática Ltda."
                />
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 3: BRANDING & ANÚNCIOS */}
        {activeSubTab === 'branding' && (
          <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm">Barra Superior de Notícias & Nome da Loja</h4>
              <p className="text-[11px] text-slate-500">Controle a mensagem de aviso que percorre o topo de todas as páginas</p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nome da Marca / Loja</label>
                  <input
                    type="text"
                    value={formData.storeName}
                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-bold"
                    placeholder="RelicVault"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Slogan / Subtítulo da Marca</label>
                  <input
                    type="text"
                    value={formData.storeTagline}
                    onChange={(e) => setFormData({ ...formData, storeTagline: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
                    placeholder="Loja Virtual de Colecionáveis Raros & Moedas"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Texto da Faixa Superior de Anúncios (Top Banner)
                </label>
                <input
                  type="text"
                  value={formData.topBar.announcementText}
                  onChange={(e) => setFormData({
                    ...formData,
                    topBar: { ...formData.topBar, announcementText: e.target.value }
                  })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-medium"
                  placeholder="Ex: 🛡️ Envio Blindado Sedex com Seguro Total | PIX com 5% de Desconto"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Etiqueta da Faixa Superior (Badge)
                </label>
                <input
                  type="text"
                  value={formData.topBar.badgeText}
                  onChange={(e) => setFormData({
                    ...formData,
                    topBar: { ...formData.topBar, badgeText: e.target.value }
                  })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-medium"
                  placeholder="Ex: Cofre Oficial"
                />
              </div>
            </div>
          </div>
        )}

        {/* Global Save Action Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {savedSuccess && (
            <span className="text-emerald-700 font-bold text-xs flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Configurações salvas e aplicadas em todo o site!</span>
            </span>
          )}

          <button
            type="submit"
            className="px-6 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-md transition cursor-pointer active:scale-98"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>Salvar Alterações no Site</span>
          </button>
        </div>
      </form>
    </div>
  );
};
