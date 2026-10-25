import React from 'react';
import { AlertTriangle, RefreshCw, ShoppingBag, Shield } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
  showStorefrontButton?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class GlobalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[GLOBAL RECOVERY] Unhandled component error caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch (e) {
        console.error('[GLOBAL RECOVERY] onReset handler error:', e);
      }
    }
  };

  handleGoStorefront = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('abhi_fashion_app_mode', 'customer');
      } catch {}
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0E1628] border border-amber-500/40 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/40">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wider">
                {this.props.fallbackTitle || 'Display Recovery'}
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {this.props.fallbackMessage ||
                  'Ek temporary display issue safely handle kar liya gaya hai. Aapka store data aur orders bilkul surakshit hain.'}
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl text-left max-h-28 overflow-y-auto">
                <span className="text-[10px] font-mono text-rose-400 block break-words">
                  {this.state.error.message || String(this.state.error)}
                </span>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Screen</span>
              </button>

              {(this.props.showStorefrontButton !== false) && (
                <button
                  type="button"
                  onClick={this.handleGoStorefront}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                  <span>Customer Store</span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
