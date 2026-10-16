import cascadeLayers from '@csstools/postcss-cascade-layers';
import tailwindcss from '@tailwindcss/postcss';

/**
 * Tailwind v4 wraps its output in CSS cascade layers, which Chrome < 99, Firefox < 97
 * and Safari < 15.4 ignore entirely. The brief supports Chrome 90+, Firefox 88+,
 * Safari 14+ and Edge 90+, so the layers are flattened into equivalent specificity.
 */
export default {
  plugins: [tailwindcss(), cascadeLayers()],
};
