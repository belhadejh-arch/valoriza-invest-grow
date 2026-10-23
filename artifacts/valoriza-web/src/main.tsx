import { createRoot } from 'react-dom/client';

import { ErrorBoundary } from '@/components/error-boundary';
import { loadLegacyLanguage, storedLanguage } from '@/lib/legacy-i18n';

import './styles.css';

const container = document.getElementById('root')!;
const language = storedLanguage();
const messages = {
  ar: { loading: 'جارٍ تحميل المنصة…', error: 'تعذر تحميل المنصة. تحقق من اتصالك.', retry: 'إعادة المحاولة' },
  en: { loading: 'Loading the platform…', error: 'Unable to load the platform. Check your connection.', retry: 'Retry' },
  es: { loading: 'Cargando la plataforma…', error: 'No se pudo cargar la plataforma. Comprueba tu conexión.', retry: 'Reintentar' },
}[language];
document.documentElement.lang = language;
document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
const loading = document.createElement('div');
loading.className = 'min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground';
loading.setAttribute('role', 'status');
loading.textContent = messages.loading;
container.append(loading);

async function start() {
  // Language changes reload the app; await the selected dictionary so that
  // legacy route labels never briefly render in the wrong language.
  await loadLegacyLanguage(language);
  const { default: App } = await import('./App');
  createRoot(container, {
    onCaughtError: (error, errorInfo) => {
      console.error(error, errorInfo.componentStack);
    },
  }).render(<ErrorBoundary><App /></ErrorBoundary>);
}

void start().catch(() => {
  loading.textContent = messages.error;
  const retry = document.createElement('button');
  retry.textContent = messages.retry;
  retry.className = 'rounded-full bg-primary px-5 py-2 text-primary-foreground';
  retry.addEventListener('click', () => window.location.reload());
  loading.append(retry);
});
