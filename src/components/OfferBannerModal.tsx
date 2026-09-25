import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Sparkles,
  Image as ImageIcon,
  Trash2,
  CheckCircle,
  Eye,
  Plus,
  Tag,
  CreditCard,
  Edit2,
  RefreshCw,
  Camera,
} from 'lucide-react';
import { Banner, CategoryId } from '../types';

interface OfferBannerModalProps {
  banners: Banner[];
  onSaveBanner: (banner: Banner) => void;
  onDeleteBanner: (id: string) => void;
  onClose: () => void;
}

// Curated high-res fashion offer banner preset photos
const PRESET_BANNER_IMAGES = [
  {
    name: 'Festive Suits & Shirts',
    url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Trendy Denim & Casuals',
    url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Premium Shirts Collection',
    url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Royal Oxford & Formals',
    url: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Streetwear & Jackets',
    url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=1600&auto=format&fit=crop&q=80',
  },
];

export const OfferBannerModal: React.FC<OfferBannerModalProps> = ({
  banners,
  onSaveBanner,
  onDeleteBanner,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [badge, setBadge] = useState('🔥 DHAMAKA OFFER');
  const [offerText, setOfferText] = useState('FLAT 30% OFF • CASH ON DELIVERY AVAILABLE');
  const [image, setImage] = useState(PRESET_BANNER_IMAGES[0].url);
  const [categoryId, setCategoryId] = useState<CategoryId>('shirts');
  const [isEnabled, setIsEnabled] = useState(true);

  const [isUploading, setIsUploading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Photo selection from Phone camera/gallery
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setImage(result);
      }
      setIsUploading(false);
    };
    reader.onerror = () => {
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleEditExisting = (b: Banner) => {
    setEditingBannerId(b.id);
    setTitle(b.title);
    setSubtitle(b.subtitle);
    setBadge(b.badge);
    setOfferText(b.offerText);
    setImage(b.image);
    setCategoryId(b.categoryId || 'shirts');
    setIsEnabled(b.isEnabled);
    setActiveTab('create');
  };

  const handleResetForm = () => {
    setEditingBannerId(null);
    setTitle('');
    setSubtitle('');
    setBadge('🔥 DHAMAKA OFFER');
    setOfferText('FLAT 30% OFF • CASH ON DELIVERY AVAILABLE');
    setImage(PRESET_BANNER_IMAGES[0].url);
    setCategoryId('shirts');
    setIsEnabled(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Kripya Offer Ka Title / Naam Dalein');
      return;
    }
    if (!image.trim()) {
      alert('Kripya Offer Ki Photo Dalein');
      return;
    }

    const newBanner: Banner = {
      id: editingBannerId || `banner-${Date.now()}`,
      title: title.trim().toUpperCase(),
      subtitle: subtitle.trim() || 'EXCLUSIVE OFFER AT ABHI FASHION',
      badge: badge.trim() || 'SPECIAL OFFER',
      offerText: offerText.trim() || 'LIMITED TIME DEALS',
      image: image.trim(),
      categoryId: categoryId || undefined,
      isEnabled,
    };

    onSaveBanner(newBanner);
    setSavedSuccess(true);

    setTimeout(() => {
      setSavedSuccess(false);
      handleResetForm();
      setActiveTab('list');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#0B1120] rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>ऊपर के बॉक्स में नया ऑफर जोड़ें</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  TOP BOX OFFERS
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Photo ke sath naya offer dalein - Har customer ke app me turant update hoga!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-2 gap-2">
          <button
            onClick={() => {
              setActiveTab('create');
              if (!editingBannerId) handleResetForm();
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'create'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{editingBannerId ? '✏️ Edit Offer' : '➕ Naya Offer Jodein (Add Offer)'}</span>
          </button>

          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'list'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>📋 Chal Rahe Offers ({banners.length})</span>
          </button>
        </div>

        {/* Success Banner */}
        {savedSuccess && (
          <div className="m-4 p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-black flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>
              Badhaai! Offer safalta-purvak save ho gaya hai aur sabhi customer ke app me turant live ho
              gaya hai!
            </span>
          </div>
        )}

        {/* TAB 1: CREATE / EDIT OFFER */}
        {activeTab === 'create' && (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Live Banner Preview Box */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>App Screen Par Aisa Dikhega (Live Preview):</span>
                </label>
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                  Top Hero Box
                </span>
              </div>

              <div className="relative w-full h-44 sm:h-52 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shadow-xl flex items-center">
                {image ? (
                  <img
                    src={image}
                    alt="Preview"
                    className="absolute inset-0 w-full h-full object-cover brightness-[0.45]"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                    <ImageIcon className="w-8 h-8 mb-1" />
                    <span className="text-xs">Photo Chunein</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1D] via-[#0A0F1D]/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0A0F1D] via-[#0A0F1D]/70 to-transparent" />

                <div className="relative z-10 p-4 sm:p-6 max-w-md text-left">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-rose-600/40 border border-rose-500/50 text-rose-300 text-[10px] font-black uppercase mb-1.5">
                    {badge || 'SPECIAL OFFER'}
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-white uppercase leading-tight line-clamp-2">
                    {title || 'APNA OFFER TITLE YAHAN LIKHEIN'}
                  </h3>
                  <p className="text-amber-400 text-xs font-bold mt-1 line-clamp-1">
                    {subtitle || 'Offer Subtitle & Details'}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/90 text-[10px] text-slate-200 border border-slate-700">
                    <CreditCard className="w-3 h-3 text-amber-400" />
                    <span className="line-clamp-1">{offerText || 'Special Store Discount'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Photo Selection / Upload */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <label className="block text-xs font-black text-slate-200 uppercase tracking-wider">
                📸 1. Offer Photo (फोटो लगाएं)
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoSelect}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>
                    {isUploading ? 'Uploading...' : 'Phone Gallery / Camera Se Photo Chunein'}
                  </span>
                </button>

                <span className="text-[11px] text-slate-400 font-semibold">ya neeche presets chunein:</span>
              </div>

              {/* Photo Presets */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                {PRESET_BANNER_IMAGES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImage(preset.url)}
                    className={`relative rounded-xl overflow-hidden border p-1 text-left transition cursor-pointer group ${
                      image === preset.url
                        ? 'border-amber-400 ring-2 ring-amber-400/40 bg-amber-950/20'
                        : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="w-full h-14 object-cover rounded-lg group-hover:scale-105 transition"
                    />
                    <span className="block text-[9px] font-bold text-slate-300 mt-1 truncate">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>

              {/* Image URL input */}
              <div className="pt-1">
                <label className="block text-[10px] text-slate-400 mb-1">
                  Photo Web Link / URL (Optional direct URL):
                </label>
                <input
                  type="text"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-hidden focus:border-amber-400"
                />
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Offer Title / Main Heading *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. DIWALI DHAMAKA SALE / FLAT 40% OFF"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Subtitle / Tagline
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. Sabhi Shirts & Formals Par Bhaari Chhoot"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-hidden focus:border-amber-400"
                />
              </div>
            </div>

            {/* Badge & Offer Tagline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Offer Badge / Tag
                </label>
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="e.g. 🔥 LIMITED TIME OFFER"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-hidden focus:border-amber-400"
                />
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  {['🔥 DHAMAKA OFFER', '🎉 FESTIVE SPECIAL', '⚡ CHHUIKHADAN MEGA SALE'].map((b, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setBadge(b)}
                      className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md cursor-pointer"
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Offer Text / Discount Info
                </label>
                <input
                  type="text"
                  value={offerText}
                  onChange={(e) => setOfferText(e.target.value)}
                  placeholder="e.g. BUY 2 GET 1 FREE • COD AVAILABLE"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-hidden focus:border-amber-400"
                />
              </div>
            </div>

            {/* Category & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Click Karne Par Kaunsi Category Khule?
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-400"
                >
                  <option value="shirts">Shirts (शर्ट्स)</option>
                  <option value="t-shirts">T-Shirts (टी-शर्ट्स)</option>
                  <option value="jeans">Jeans (जींस)</option>
                  <option value="trousers">Trousers (ट्राउजर्स)</option>
                  <option value="jackets">Jackets (जैकेट्स)</option>
                  <option value="footwear">Footwear (जूते/चप्पल)</option>
                  <option value="accessories">Accessories (बेल्ट/घड़ी)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Status (चालू या बंद)
                </label>
                <div className="flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={isEnabled}
                      onChange={() => setIsEnabled(true)}
                      className="accent-amber-500"
                    />
                    <span className="text-xs font-bold text-emerald-400">🟢 Active (Screen par dikhega)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!isEnabled}
                      onChange={() => setIsEnabled(false)}
                      className="accent-amber-500"
                    />
                    <span className="text-xs font-bold text-slate-400">⚪ Disabled (Band)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetForm}
                className="text-xs text-slate-400 hover:text-white px-3 py-2 rounded-xl transition cursor-pointer"
              >
                Clear Form
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {editingBannerId ? 'Update & Live Karein' : 'Top Box Me Live Karein (तुरंत जोड़ें)'}
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: ACTIVE BANNERS LIST & DELETE OPTION */}
        {activeTab === 'list' && (
          <div className="p-4 sm:p-6 space-y-3 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-300 font-semibold">
                Uper hero box me abhi kul <span className="text-amber-400 font-bold">{banners.length}</span>{' '}
                offers chal rahe hain. Purana ya sample offer hatane ke liye Delete dabayein:
              </p>
              <button
                onClick={() => {
                  handleResetForm();
                  setActiveTab('create');
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Naya Offer Jodein</span>
              </button>
            </div>

            {banners.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800">
                <p className="text-slate-400 text-xs mb-3">Koi offer banner nahi hai.</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold"
                >
                  Pehla Offer Photo Ke Sath Jodein
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {banners.map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-2xl bg-[#0F172A] border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between transition"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={b.image}
                        alt=""
                        className="w-20 h-14 rounded-xl object-cover bg-slate-800 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                            {b.badge}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                              b.isEnabled
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {b.isEnabled ? 'Active' : 'Off'}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm text-white line-clamp-1">{b.title}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{b.subtitle}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{b.offerText}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => handleEditExisting(b)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                        title="Edit Offer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {deleteConfirmId === b.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              onDeleteBanner(b.id);
                              setDeleteConfirmId(null);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black transition cursor-pointer"
                          >
                            Pakka Hatayein
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-[11px]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(b.id)}
                          className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                          title="Delete Banner from Screen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
