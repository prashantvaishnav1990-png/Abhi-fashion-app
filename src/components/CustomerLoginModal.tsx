import React, { useState } from 'react';
import {
  Smartphone,
  User,
  ShieldCheck,
  CheckCircle2,
  X,
  ArrowRight,
  Sparkles,
  Lock,
  RefreshCw,
  ShoppingBag,
  Clock,
  LogOut,
  MapPin,
} from 'lucide-react';
import { CustomerProfile, Order } from '../types';
import { CustomerService } from '../services/customerService';

interface CustomerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCustomer: CustomerProfile | null;
  onLoginSuccess: (customer: CustomerProfile, orders: Order[]) => void;
  onLogout: () => void;
}

export const CustomerLoginModal: React.FC<CustomerLoginModalProps> = ({
  isOpen,
  onClose,
  currentCustomer,
  onLoginSuccess,
  onLogout,
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState<'enter_phone' | 'enter_otp'>(
    currentCustomer ? 'enter_phone' : 'enter_phone'
  );
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('8941');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handle Send OTP / Proceed
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const clean = mobile.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) {
      setErrorMsg('Kripya valid 10-digit mobile number darj karein (e.g. 98261XXXXX).');
      return;
    }

    // Generate random 4-digit OTP for demo simulation
    const randomOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(randomOtp);
    setOtp(randomOtp); // Pre-fill for ultra smooth user experience
    setStep('enter_otp');
  };

  // Handle Verify & Login
  const handleVerifyLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const clean = mobile.replace(/\D/g, '').slice(-10);
      const result = await CustomerService.login(clean, name);

      setSuccessMsg(
        result.orders.length > 0
          ? `Welcome back! Aapke ${result.orders.length} pichle orders aur cart data restore ho gaya hai.`
          : `Swagat hai! Aapka account safalta-purvak create ho gaya hai.`
      );

      setTimeout(() => {
        setIsLoading(false);
        onLoginSuccess(result.customer, result.orders);
        onClose();
      }, 1000);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Login karne me samasya aayi. Kripya punah prayas karein.');
    }
  };

  return (
    <div
      id="customer-login-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="customer-login-modal"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-[#0F172A] rounded-t-3xl sm:rounded-3xl border border-slate-800 text-slate-100 shadow-2xl overflow-hidden p-5 sm:p-6 animate-in slide-in-from-bottom-6 duration-300"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close login dialog"
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 p-0.5 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <div className="w-full h-full bg-[#0F172A] rounded-[14px] flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg font-black text-white uppercase tracking-wider">
                ABHI FASHION
              </h2>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-400/20 text-amber-400 border border-amber-400/30">
                CHHUIKHADAN
              </span>
            </div>
            <p className="text-xs text-slate-400">Mobile Login & Instant Data Sync</p>
          </div>
        </div>

        {/* If Customer is Already Logged In */}
        {currentCustomer ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-white">Aap Login Hain</h4>
                <p className="text-xs text-emerald-300/90 mt-0.5">
                  Mobile: <strong className="text-white">+91 {currentCustomer.mobile}</strong>
                  {currentCustomer.name && (
                    <span className="block mt-0.5">Naam: {currentCustomer.name}</span>
                  )}
                </p>
                {currentCustomer.city && (
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-rose-400" />
                    {currentCustomer.address ? `${currentCustomer.address}, ` : ''}{currentCustomer.city}
                  </p>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>Multi-Device Automatic Sync</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Aapka saara data (Cart, Orders aur Address) iss mobile number se linked hai. Kisi bhi naye phone me ye number daalne par aapka data automatically aa jayega!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                Shopping Jaari Rakhein
              </button>
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  setStep('enter_phone');
                  setMobile('');
                  setName('');
                  setSuccessMsg('Account logout ho gaya hai.');
                }}
                className="py-2.5 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout / Doosra Number
              </button>
            </div>
          </div>
        ) : (
          /* Login Form (Step 1: Phone + Name) */
          step === 'enter_phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="bg-amber-400/10 border border-amber-400/25 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-300">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Mobile Login ka Fayda:</strong> Chahe aap jitni baar bhi app kholein ya naye device me login karein, aapka <strong>Cart, Orders aur Saved Address</strong> automatically aa jayega!
                </p>
              </div>

              {/* Mobile Number Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Mobile Number <span className="text-rose-400">*</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 flex items-center gap-1.5 text-slate-400 font-bold text-xs border-r border-slate-700 pr-2">
                    <span className="text-sm">🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="98261 XXXXX"
                    value={mobile}
                    onChange={(e) => {
                      setMobile(e.target.value.replace(/\D/g, '').slice(0, 10));
                      setErrorMsg('');
                    }}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-20 pr-3 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  10 ankon ka mobile number darj karein
                </p>
              </div>

              {/* Customer Name Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Aapka Naam (Customer Name)
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-slate-400 absolute left-3" />
                  <input
                    type="text"
                    placeholder="e.g. Rahul Verma / Suresh Sahu"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 font-medium bg-rose-950/40 border border-rose-500/30 p-2.5 rounded-xl">
                  {errorMsg}
                </p>
              )}

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  id="btn-customer-send-otp"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition cursor-pointer"
                >
                  <span>Aage Badhein / Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  Baad me login karein (Guest Browse)
                </button>
              </div>
            </form>
          ) : (
            /* Step 2: OTP / Instant Verify */
            <form onSubmit={handleVerifyLogin} className="space-y-4 animate-in fade-in">
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-xs text-slate-400">Mobile number par OTP bheja gaya:</span>
                <p className="text-sm font-black text-white font-mono mt-0.5">
                  +91 {mobile}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-mono">
                  <span>Fast Demo OTP:</span>
                  <strong className="text-amber-200 font-black">{generatedOtp}</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 text-center">
                  4-Digit OTP Code
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-40 mx-auto block text-center tracking-[0.6em] text-xl font-mono font-black bg-slate-900 border-2 border-amber-400/60 rounded-xl py-2 text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 font-medium bg-rose-950/40 border border-rose-500/30 p-2.5 rounded-xl text-center">
                  {errorMsg}
                </p>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  id="btn-customer-verify-otp"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Data Sync ho raha hai...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify & Login Karein</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('enter_phone')}
                  className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  ← Number badlein
                </button>
              </div>
            </form>
          )
        )}
      </div>
    </div>
  );
};
