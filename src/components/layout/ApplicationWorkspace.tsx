import { X } from 'lucide-react';
import { useEffect } from 'react';
import { getLoanProduct } from '../../constants/loan';
import { navigateTo } from '../../hooks/useRoute';
import { useApplicationStore } from '../../store/applicationStore';
import { Button } from '../common/Button';
import { Wizard } from '../wizard/Wizard';
import { AppHeader } from './AppHeader';
import { StepGuidance } from './StepGuidance';

/**
 * Experience B — the application workspace: compact header, the wizard in the main
 * column and a contextual side panel (collapsed into the flow on small screens).
 */
export default function ApplicationWorkspace() {
  const loanType = useApplicationStore((state) => state.data.loan.loanType);
  const product = getLoanProduct(loanType);

  // Clear applicant data from memory when leaving the workspace (B4.4).
  useEffect(() => () => useApplicationStore.getState().reset(), []);

  return (
    <div className="min-h-dvh">
      <AppHeader
        title={product ? `${product.label} application` : 'Loan application'}
        actions={(
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateTo('landing')}
            leadingIcon={<X aria-hidden="true" className="size-4" />}
          >
            Exit
          </Button>
        )}
      />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-6 pb-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10 lg:pt-10">
        <main id="main-content" className="min-w-0">
          <Wizard />
        </main>
        <aside aria-label="Application summary" className="hidden lg:block">
          <div className="sticky top-24 flex flex-col gap-4">
            <StepGuidance />
          </div>
        </aside>
      </div>
    </div>
  );
}
