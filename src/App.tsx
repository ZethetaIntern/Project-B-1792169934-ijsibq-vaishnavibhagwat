import { lazy, Suspense } from 'react';
import { ToastProvider } from './components/common/Toast';
import { Spinner } from './components/common/Spinner';
import { navigateTo, useRoute } from './hooks/useRoute';

const ApplicationWorkspace = lazy(() => import('./components/layout/ApplicationWorkspace'));

function LandingPlaceholder() {
  return (
    <main id="main-content" className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-4 px-4">
      <h1 className="text-4xl font-semibold tracking-tight text-ink">LendSwift</h1>
      <p className="text-slate">Apply for a Personal, Home or Business loan in eight guided steps.</p>
      <div>
        <button
          type="button"
          onClick={() => navigateTo('apply')}
          className="h-11 rounded-field bg-brand px-5 font-medium text-white"
        >
          Start your application
        </button>
      </div>
    </main>
  );
}

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
        {route === 'apply' ? <ApplicationWorkspace /> : <LandingPlaceholder />}
      </Suspense>
    </ToastProvider>
  );
}

export default App;
