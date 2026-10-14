import type { ComponentType, LazyExoticComponent } from 'react';
import type { StepId } from '../../types/application';
import { lazyWithRetry } from '../../utils/lazyWithRetry';

/**
 * Step components are code-split: only the open step's JavaScript is downloaded,
 * keeping the main chunk small for low-end devices on patchy networks. A dropped
 * chunk request is retried before the step reports that it could not load.
 */
export const STEP_COMPONENTS: Record<StepId, LazyExoticComponent<ComponentType>> = {
  loan: lazyWithRetry(() => import('../steps/Step1LoanType')),
  personal: lazyWithRetry(() => import('../steps/Step2PersonalInfo')),
  kyc: lazyWithRetry(() => import('../steps/Step3KYC')),
  address: lazyWithRetry(() => import('../steps/Step4Address')),
  employment: lazyWithRetry(() => import('../steps/Step5Employment')),
  coApplicant: lazyWithRetry(() => import('../steps/Step6CoApplicant')),
  documents: lazyWithRetry(() => import('../steps/Step7Documents')),
  review: lazyWithRetry(() => import('../steps/Step8Review')),
};
