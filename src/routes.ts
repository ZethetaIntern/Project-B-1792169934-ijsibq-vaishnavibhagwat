import { STEP_COMPONENTS } from './components/wizard/stepComponents';
import { STEP_ORDER } from './constants/steps';
import { routeFromPath } from './hooks/useRoute';
import { lazyWithRetry } from './utils/lazyWithRetry';

/**
 * The two top-level pages, each in its own chunk: the landing page's code is not
 * downloaded on /apply, and the application's not on the landing page.
 */
export const LandingRoute = lazyWithRetry(() => import('./components/landing/LandingRoute'));
export const ApplicationWorkspace = lazyWithRetry(() => import('./components/layout/ApplicationWorkspace'));

/**
 * Downloads the page being opened (on /apply, also the step in the URL, else
 * Step 1). main.tsx renders once this settles, so the first render shows the page
 * itself rather than a spinner. Never rejects: a failed download surfaces in the
 * route's error boundary, which offers a reload.
 */
export function preloadCurrentRoute(): Promise<void> {
  if (routeFromPath(window.location.pathname) === 'landing') return LandingRoute.preload();
  const requested = new URLSearchParams(window.location.search).get('step');
  const firstStep = STEP_ORDER.find((id) => id === requested) ?? 'loan';
  return Promise.all([ApplicationWorkspace.preload(), STEP_COMPONENTS[firstStep].preload()])
    .then(() => undefined);
}
