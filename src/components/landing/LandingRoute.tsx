import { DemoLauncher } from '../demo/DemoLauncher';
import { LandingPage } from './LandingPage';

/** The landing page as its own code-split route (see routes.ts), with the demo launcher. */
export default function LandingRoute() {
  return <LandingPage secondaryAction={<DemoLauncher />} />;
}
