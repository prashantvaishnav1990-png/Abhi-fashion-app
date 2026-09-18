import React from 'react';
import { MessageCircle } from 'lucide-react';
import { StoreSettings } from '../types';

interface WhatsAppFloatingButtonProps {
  settings: StoreSettings;
}

export const WhatsAppFloatingButton: React.FC<WhatsAppFloatingButtonProps> = ({
  settings,
}) => {
  const handleClick = () => {
    const cleanNumber = settings.whatsappNumber.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Hello ${settings.storeName} (Chhuikhadan), I have an inquiry regarding men's clothing collection and sizes.`
    );
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      id="btn-whatsapp-floating"
      onClick={handleClick}
      aria-label="Chat on WhatsApp with ABHI FASHION"
      className="fixed bottom-20 md:bottom-6 right-4 z-40 bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-3.5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition duration-200 flex items-center gap-2 group border-2 border-emerald-300/40 cursor-pointer"
    >
      <MessageCircle className="w-6 h-6 fill-current text-slate-950" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 font-extrabold text-xs text-slate-950 pr-1">
        Chat with Store
      </span>
    </button>
  );
};
