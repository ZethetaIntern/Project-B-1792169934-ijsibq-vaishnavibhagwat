import { lazy, Suspense } from 'react';
import { ToastProvider } from './components/common/Toast';
import { Spinner } from './components/common/Spinner';
import { DemoLauncher } from './components/demo/DemoLauncher';
import { LandingPage } from './components/landing/LandingPage';
import { useRoute } from './hooks/useRoute';

const ApplicationWorkspace = lazy(() => import('./components/layout/ApplicationWorkspace'));

function RouteFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-cobalt">
      <Spinner className="size-6" label="Loading" />
    </div>
  );
}

function App() {
  const route = useRoute();
  return (
    <ToastProvider>
      <a
        href="#main-content"
        className="sr-only z-[70] rounded-field bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to main content
      </a>
      <Suspense fallback={<RouteFallback />}>
        {route === 'apply' ? <ApplicationWorkspace /> : <LandingPage secondaryAction={<DemoLauncher />} />}
      </Suspense>
    </ToastProvider>
  );
}

export default App;
