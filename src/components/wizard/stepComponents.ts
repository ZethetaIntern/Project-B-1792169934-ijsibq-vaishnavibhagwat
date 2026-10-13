import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { StepId } from '../../types/application';

/**
 * Step components are code-split: only the open step's JavaScript is downloaded,
 * keeping the main chunk small for low-end devices on patchy networks.
 */
export const STEP_COMPONENTS: Record<StepId, LazyExoticComponent<ComponentType>> = {
  loan: lazy(() => import('../steps/Step1LoanType')),
  personal: lazy(() => import('../steps/Step2PersonalInfo')),
  kyc: lazy(() => import('../steps/Step3KYC')),
  address: lazy(() => import('../steps/PlaceholderStep')),
  employment: lazy(() => import('../steps/PlaceholderStep')),
  coApplicant: lazy(() => import('../steps/PlaceholderStep')),
  documents: lazy(() => import('../steps/PlaceholderStep')),
  review: lazy(() => import('../steps/PlaceholderStep')),
};
