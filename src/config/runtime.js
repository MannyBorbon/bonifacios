const APP_MODE = (import.meta.env.VITE_APP_MODE || 'production').toLowerCase();

const SANDBOX_LABEL = import.meta.env.VITE_SANDBOX_LABEL || 'SANDBOX';

const SANDBOX_HOSTS = (import.meta.env.VITE_SANDBOX_HOSTS || '')
  .split(',')
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);

function getCurrentHostname() {
  if (typeof window === 'undefined') return '';
  return window.location.hostname.toLowerCase();
}

function isSandboxHost(hostname) {
  if (!hostname) return false;
  return SANDBOX_HOSTS.includes(hostname);
}

export function isSandboxEnvironment() {
  const hostname = getCurrentHostname();
  return APP_MODE === 'sandbox' || isSandboxHost(hostname);
}

export function getSandboxLabel() {
  return SANDBOX_LABEL;
}

export function applySandboxSeoGuards() {
  if (typeof document === 'undefined' || !isSandboxEnvironment()) return;

  const robotsContent = 'noindex, nofollow, noarchive, nosnippet, noimageindex';
  let robotsMeta = document.querySelector('meta[name="robots"]');
  if (!robotsMeta) {
    robotsMeta = document.createElement('meta');
    robotsMeta.setAttribute('name', 'robots');
    document.head.appendChild(robotsMeta);
  }
  robotsMeta.setAttribute('content', robotsContent);
}
