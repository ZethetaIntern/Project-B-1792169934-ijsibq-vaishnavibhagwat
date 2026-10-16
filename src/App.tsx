import { Suspense } from 'react';
import { LoadErrorBoundary } from './components/common/LoadErrorBoundary';
import { ToastProvider } from './components/common/Toast';
import { Spinner } from './components/common/Spinner';
import { DemoLauncher } from './components/demo/DemoLauncher';
import { LandingPage } from './components/landing/LandingPage';
import { STEP_COMPONENTS } from './components/wizard/stepComponents';
import { routeFromPath, useRoute } from './hooks/useRoute';
import { STEP_ORDER } from './constants/steps';
import { lazyWithRetry } from './utils/lazyWithRetry';

const ApplicationWorkspace = lazyWithRetry(() => import('./components/layout/ApplicationWorkspace'));

// Opening /apply directly: fetch the workspace and the step in the URL (else Step 1)
// in parallel, instead of discovering the step only once the workspace has rendered.
if (routeFromPath(window.location.pathname) === 'apply') {
  const requested = new URLSearchParams(window.location.search).get('step');
  const firstStep = STEP_ORDER.find((id) => id === requested) ?? 'loan';
  ApplicationWorkspace.preload();
  STEP_COMPONENTS[firstStep].preload();
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
      <LoadErrorBoundary key={route} title="The application did not load">
        <Suspense fallback={<RouteFallback />}>
          {route === 'apply' ? <ApplicationWorkspace /> : <LandingPage secondaryAction={<DemoLauncher />} />}
        </Suspense>
      </LoadErrorBoundary>
    </ToastProvider>
  );
}

export default App;
