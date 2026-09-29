import React from 'react';
import { Search, ShoppingBag, Shield, Sparkles, MapPin, Smartphone, User, Home, Grid, PackageCheck } from 'lucide-react';
import { CustomerProfile, StoreSettings } from '../types';

interface HeaderProps {
  settings: StoreSettings;
  cartCount: number;
  onOpenCart: () => void;
  onOpenSearch: () => void;
  onNavigateHome: () => void;
  onOpenAdmin?: () => void;
  showAdminButton?: boolean;
  activeView: 'home' | 'categories' | 'cart' | 'orders' | 'admin';
  onChangeTab?: (tab: 'home' | 'categories' | 'cart' | 'orders') => void;
  currentCustomer?: CustomerProfile | null;
  onOpenLogin?: () => void;
}

interface NavTabItem {
  id: 'home' | 'categories' | 'cart' | 'orders';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  cartCount,
  onOpenCart,
  onOpenSearch,
  onNavigateHome,
  onOpenAdmin,
  showAdminButton = false,
  activeView,
  onChangeTab,
  currentCustomer,
  onOpenLogin,
}) => {
  const navTabs: NavTabItem[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'categories', label: 'Categories', icon: Grid },
    { id: 'cart', label: 'Bag', icon: ShoppingBag, badge: cartCount },
    { id: 'orders', label: 'Orders', icon: PackageCheck },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0B132B]/95 backdrop-blur-md border-b border-slate-800/80 shadow-lg pt-[env(safe-area-inset-top,0px)]">
      {/* Top Header Row: Brand Logo & User Actions */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
        {/* Brand Logo & Name */}
        <button
          id="brand-logo-button"
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 text-left group cursor-pointer"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-rose-600 p-0.5 shadow-md group-hover:scale-105 transition">
            <div className="w-full h-full bg-[#0B132B] rounded-[10px] flex items-center justify-center">
              <span className="font-extrabold text-amber-400 text-sm tracking-tighter">AF</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-base sm:text-lg tracking-wider text-white uppercase group-hover:text-amber-400 transition">
                {settings.storeName}
              </span>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400/10 text-amber-400 border border-amber-400/30">
                MEN'S WEAR
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-1 truncate max-w-[170px] sm:max-w-none">
              <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
              <span>{settings.storeAddress}</span>
            </p>
          </div>
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Search Button */}
          <button
            id="header-search-btn"
            onClick={onOpenSearch}
            aria-label="Search clothing"
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700/60 transition cursor-pointer"
          >
            <Search className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline text-slate-300">Search shirts, jeans...</span>
          </button>

          {/* Admin Mode Shortcut (only if enabled) */}
          {showAdminButton && onOpenAdmin && (
            <button
              id="header-admin-btn"
              onClick={onOpenAdmin}
              title="Open Admin Store Manager"
              aria-label="Admin Dashboard"
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                activeView === 'admin'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
              }`}
            >
              <Shield className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Admin App</span>
            </button>
          )}

          {/* Mobile Login / Customer Profile Button */}
          {onOpenLogin && (
            <button
              id="header-login-btn"
              onClick={onOpenLogin}
              title={currentCustomer ? `Logged in: +91 ${currentCustomer.mobile}` : 'Login with Mobile Number'}
              aria-label="Customer Profile & Mobile Login"
              className={`p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                currentCustomer
                  ? 'bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40'
              }`}
            >
              {currentCustomer ? (
                <>
                  <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="hidden sm:inline max-w-[85px] truncate">
                    {currentCustomer.name ? currentCustomer.name.split(' ')[0] : currentCustomer.mobile.slice(-4)}
                  </span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="hidden sm:inline">Login</span>
                </>
              )}
            </button>
          )}

          {/* Cart Button */}
          <button
            id="header-cart-btn"
            onClick={onOpenCart}
            aria-label="Shopping Cart"
            className="relative p-2 sm:px-3 sm:py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 active:scale-95 transition cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-slate-950" />
            <span className="hidden sm:inline">Bag</span>
            {cartCount > 0 && (
              <span
                id="cart-badge-count"
                className="bg-white text-slate-950 text-[11px] font-black rounded-full h-4.5 min-w-4.5 px-1 flex items-center justify-center shadow-xs"
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Relocated App Navigation Bar (Moved from bottom to top, safely away from phone's back key) */}
      {onChangeTab && (
        <nav
          id="main-app-nav-top"
          aria-label="Store Navigation Bar"
          className="border-t border-slate-800/90 px-2 py-1.5 bg-slate-950/80 backdrop-blur-md"
        >
          <div className="grid grid-cols-4 gap-1.5 max-w-xl mx-auto">
            {navTabs.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => onChangeTab(item.id)}
                  className={`flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-1.5 sm:px-2 rounded-xl text-xs font-black transition cursor-pointer relative active:scale-95 ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
                  <span className="truncate text-[11px] sm:text-xs">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] font-black h-4 min-w-4 px-1 rounded-full flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-slate-950 text-amber-400'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
};
