// Configuration for Cloud API and Server Connectivity
// Handles seamless communication whether running on Web (Cloud Run) or Android APK (Capacitor WebView)

export const PRODUCTION_CLOUD_URL = 'https://ais-pre-3ikhphexvv4zk22tmwzsu7-644693391483.asia-east1.run.app';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // 1. Check if user configured a custom cloud backend in Admin Settings
    try {
      const custom = localStorage.getItem('abhi_fashion_cloud_api_url');
      if (custom && custom.trim().startsWith('http')) {
        return custom.trim().replace(/\/+$/, '');
      }
    } catch {}

    // 2. If running in a web browser on Cloud Run or custom domain (NOT localhost / capacitor)
    const origin = window.location.origin;
    if (
      origin &&
      !origin.includes('localhost') &&
      !origin.includes('127.0.0.1') &&
      !origin.includes('capacitor://') &&
      !origin.startsWith('file:')
    ) {
      return origin.replace(/\/+$/, '');
    }
  }

  // 3. Fallback for Android APK / Capacitor where origin is https://localhost
  return (
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
    PRODUCTION_CLOUD_URL
  );
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export function resolveImageUrl(url: string | undefined): string {
  if (!url || typeof url !== 'string') return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }
  // Bundled static assets located in public/assets/ should remain relative so WebView & Vite resolve them locally
  if (url.startsWith('/assets/')) {
    return url;
  }

  // If in web browser with standard origin
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (
      origin &&
      !origin.includes('localhost') &&
      !origin.includes('127.0.0.1') &&
      !origin.includes('capacitor://') &&
      !origin.startsWith('file:')
    ) {
      const cleanPath = url.startsWith('/') ? url : `/${url}`;
      return `${origin.replace(/\/+$/, '')}${cleanPath}`;
    }
  }

  const base = getApiBaseUrl();
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${base}${cleanPath}`;
}
