import { MAX_EMI_TO_INCOME_RATIO } from '../../constants/loan';
import { useApplicationStore } from '../../store/applicationStore';
import { getMonthlyRent } from '../../utils/applicationMetrics';
import { assessAffordability, estimateForLoan } from '../../utils/emiCalculator';
import { formatINR, formatPercent } from '../../utils/format';
import { Callout } from '../common/Callout';
import { isStepActive } from '../../constants/steps';

interface AffordabilityHintProps {
  /** Applicant's monthly income as currently typed in the step. */
  monthlyIncome: number | null;
}

/**
 * Inline EMI affordability feedback while the applicant enters income (Step 5).
 * Includes co-applicant income when that step applies and rent as an obligation.
 */
export function AffordabilityHint({ monthlyIncome }: AffordabilityHintProps) {
  const application = useApplicationStore((state) => state.data);
  const { loanType, loanAmount, tenureMonths } = application.loan;
  const estimate = estimateForLoan(loanType, loanAmount, tenureMonths);
  if (!estimate || !monthlyIncome) return null;

  const coApplicantIncome = isStepActive('coApplicant', application)
    ? application.coApplicant.monthlyIncome ?? 0
    : 0;
  const result = assessAffordability(
    estimate.emi,
    monthlyIncome + coApplicantIncome,
    getMonthlyRent(application),
  );
  if (!result) return null;

  const income = coApplicantIncome ? 'your combined monthly income' : 'your monthly income';
  return (
    <Callout
      role="status"
      tone={result.exceedsLimit ? 'warning' : 'info'}
      title={`Estimated EMI ${formatINR(estimate.emi)} is ${formatPercent(result.emiToIncomeRatio)} of ${income}`}
    >
      {result.exceedsLimit
        ? `That is above the ${formatPercent(MAX_EMI_TO_INCOME_RATIO)} guideline lenders use. You can still apply — a longer tenure or a smaller amount in Step 1 would lower it.`
        : `Within the ${formatPercent(MAX_EMI_TO_INCOME_RATIO)} guideline. These are illustrative estimates, not a credit decision.`}
    </Callout>
  );
}
