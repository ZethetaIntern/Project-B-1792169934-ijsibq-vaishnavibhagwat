import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fonts are imported here, not from index.css, so Vite resolves and bundles their
// files (Tailwind's PostCSS step would leave the font URLs unresolved).
import '@fontsource-variable/inter';
// Static weights: only downloaded where the variable font is rejected (older Firefox).
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root was not found in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
