import { useSyncExternalStore } from 'react';

export type AppRoute = 'landing' | 'apply';

export const ROUTE_PATHS: Record<AppRoute, string> = {
  landing: '/',
  apply: '/apply',
};

export function routeFromPath(pathname: string): AppRoute {
  return pathname.replace(/\/+$/, '') === ROUTE_PATHS.apply ? 'apply' : 'landing';
}

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  return () => window.removeEventListener('popstate', onChange);
}

/**
 * Minimal History API router for the two top-level experiences. A full routing
 * library is unnecessary for two routes; the wizard keeps its own step history.
 */
export function useRoute(): AppRoute {
  return useSyncExternalStore(subscribe, () => routeFromPath(window.location.pathname));
}

export function navigateTo(route: AppRoute) {
  const path = ROUTE_PATHS[route];
  if (window.location.pathname === path) return;
  window.history.pushState({ route }, '', path);
  window.dispatchEvent(new PopStateEvent('popstate', { state: { route } }));
  window.scrollTo({ top: 0 });
}
