import { z } from 'zod';
import type { ApplicationData, StepId } from '../types/application';
import { buildStep1Schema } from './step1Schema';
import { buildStep2Schema } from './step2Schema';
import { buildStep3Schema } from './step3Schema';
import { buildStep4Schema } from './step4Schema';
import { buildStep5Schema } from './step5Schema';
import { buildStep6Schema } from './step6Schema';
import { buildStep7Schema } from './step7Schema';
import { buildStep8Schema } from './step8Schema';

/**
 * Builds the Zod schema for one step from the *whole* application, so a step's
 * rules can depend on answers given elsewhere. All 14 cross-step dependencies, and
 * where each is enforced, are listed in `CROSS_STEP_DEPENDENCIES` (dependencies.ts).
 *
 * Schemas are rebuilt from the latest application every time they are used, so
 * changing an earlier answer (e.g. the loan type after reaching Step 5) immediately
 * re-validates later steps: Continue and the review page see the new rules, and
 * `getActiveSteps` inserts or drops the co-applicant step.
 */
export type StepSchemaBuilder = (application: ApplicationData) => z.ZodType;

/** Steps register their builders here as they are implemented. */
const STEP_SCHEMA_BUILDERS: Partial<Record<StepId, StepSchemaBuilder>> = {
  loan: (application) => buildStep1Schema(application),
  personal: (application) => buildStep2Schema(application),
  kyc: (application) => buildStep3Schema(application),
  address: () => buildStep4Schema(),
  employment: (application) => buildStep5Schema(application),
  coApplicant: (application) => buildStep6Schema(application),
  documents: (application) => buildStep7Schema(application),
  review: (application) => buildStep8Schema(application),
};

/** Placeholder for steps that have no rules yet: accepts the section as-is. */
const passthroughSchema = z.object({}).passthrough();

export function getStepSchema(stepId: StepId, application: ApplicationData): z.ZodType {
  return STEP_SCHEMA_BUILDERS[stepId]?.(application) ?? passthroughSchema;
}

/** Validates one step's stored data against its current (dependency-aware) schema. */
export function isStepComplete(stepId: StepId, application: ApplicationData): boolean {
  return getStepSchema(stepId, application).safeParse(application[stepId]).success;
}
