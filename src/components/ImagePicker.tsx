import React, { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, Image as ImageIcon, Check, X, Sparkles } from 'lucide-react';
import { INITIAL_PRODUCTS } from '../data/initialProducts';

interface ImagePickerProps {
  currentImage: string;
  onImageSelected: (url: string) => void;
  label?: string;
}

export const ImagePicker: React.FC<ImagePickerProps> = ({
  currentImage,
  onImageSelected,
  label = 'Foto do Colecionável',
}) => {
  const [tab, setTab] = useState<'upload' | 'presets' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gallery presets from store assets
  const presets = INITIAL_PRODUCTS.map((p) => ({
    name: p.name,
    image: p.image,
    category: p.category,
  }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        onImageSelected(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleApplyUrl = () => {
    if (urlInput.trim()) {
      onImageSelected(urlInput.trim());
      setUrlInput('');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block font-semibold text-slate-700 text-xs">{label}</label>
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={`px-2 py-1 rounded-md transition ${
              tab === 'upload' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'hover:text-slate-900'
            }`}
          >
            Upload
          </button>
          <button
            type="button"
            onClick={() => setTab('presets')}
            className={`px-2 py-1 rounded-md transition ${
              tab === 'presets' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'hover:text-slate-900'
            }`}
          >
            Galeria Presets
          </button>
          <button
            type="button"
            onClick={() => setTab('url')}
            className={`px-2 py-1 rounded-md transition ${
              tab === 'url' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'hover:text-slate-900'
            }`}
          >
            Link URL
          </button>
        </div>
      </div>

      {/* Main Preview & Selected Status */}
      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
          {currentImage ? (
            <img
              src={currentImage}
              alt="Visualização"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <ImageIcon className="w-6 h-6" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 text-xs">
          <div className="font-semibold text-slate-800 truncate">
            {currentImage ? 'Imagem Selecionada' : 'Nenhuma foto selecionada'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
            {currentImage.startsWith('data:') 
              ? 'Arquivo local carregado' 
              : currentImage ? currentImage : 'Escolha uma foto abaixo'}
          </div>
          {currentImage && (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold mt-1">
              <Check className="w-3 h-3 text-emerald-600" /> Pronta para exibição
            </span>
          )}
        </div>
      </div>

      {/* TAB 1: Upload from local files (Computer/Phone/Tablet) */}
      {tab === 'upload' && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
            dragOver
              ? 'border-amber-500 bg-amber-50/50'
              : 'border-slate-300 hover:border-amber-400 hover:bg-slate-50/70'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload className="w-6 h-6 mx-auto text-amber-600 mb-1.5" />
          <div className="text-xs font-semibold text-slate-800">
            Clique para enviar foto ou arraste o arquivo aqui
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Suporta fotos do celular, câmera, PNG, JPG ou WebP
          </p>
        </div>
      )}

      {/* TAB 2: Presets from Vault Collection */}
      {tab === 'presets' && (
        <div className="space-y-1.5">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Selecione uma imagem de alta definição do acervo:</span>
          </div>
          <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50/50">
            {presets.map((preset, idx) => {
              const isSelected = currentImage === preset.image;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onImageSelected(preset.image)}
                  className={`group relative aspect-square rounded-lg overflow-hidden border transition text-left cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-amber-500 border-amber-500'
                      : 'border-slate-200 hover:border-amber-400'
                  }`}
                  title={preset.name}
                >
                  <img
                    src={preset.image}
                    alt={preset.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Direct Web URL */}
      {tab === 'url' && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://exemplo.com/foto-do-item.jpg"
              className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="button"
            onClick={handleApplyUrl}
            className="px-3 h-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shrink-0"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
};
