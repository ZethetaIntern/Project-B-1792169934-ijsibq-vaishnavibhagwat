import { describe, expect, it } from 'vitest';
import { getActiveSteps } from '../constants/steps';
import { getStepSchema } from '../schemas/schemaFactory';
import { needsHighEmiAcknowledgement } from '../schemas/step8Schema';
import { SIGNATURE_PNG, uploadedFile } from '../test/fixtures';
import type { ApplicationData } from '../types/application';
import { getDocumentRequirements } from '../utils/documentRequirements';
import { DEMO_SCENARIOS } from './scenarios';

/** What the applicant still does by hand in the demo: verify, consent, sign, upload. */
function completeByHand(scenario: ApplicationData): ApplicationData {
  const data: ApplicationData = structuredClone(scenario);
  data.personal.mobileVerified = true;
  data.kyc.panVerified = true;
  data.kyc.aadhaarVerified = true;
  data.coApplicant = {
    ...data.coApplicant, panVerified: true, consent: true, signature: SIGNATURE_PNG,
  };
  data.documents = {
    files: Object.fromEntries(getDocumentRequirements(data)
      .filter((requirement) => requirement.required)
      .map(({ spec }) => [spec.id, [uploadedFile(`${spec.id}.pdf`)]])),
    signature: SIGNATURE_PNG,
    signatureMethod: 'type',
  };
  return data;
}

describe('demo scenarios', () => {
  it.each(DEMO_SCENARIOS.map((scenario) => [scenario.id, scenario] as const))('%s passes every real step rule once completed by hand', (_, scenario) => {
    const data = completeByHand(scenario.data);
    getActiveSteps(data).filter((step) => step.id !== 'review').forEach((step) => {
      const result = getStepSchema(step.id, data).safeParse(data[step.id]);
      const issues = result.success ? [] : result.error.issues;
      expect({ step: step.id, issues }).toEqual({ step: step.id, issues: [] });
    });
  });

  it('leaves every verification to the applicant', () => {
    DEMO_SCENARIOS.forEach(({ data }) => {
      expect(data.personal.mobileVerified).toBe(false);
      expect(data.kyc.panVerified).toBe(false);
      expect(data.kyc.aadhaarVerified).toBe(false);
      expect(data.coApplicant.panVerified).toBe(false);
      expect(data.review).toEqual(expect.objectContaining({ accuracy: false, terms: false }));
    });
  });

  it('covers the conditional rules the guide promises', () => {
    const byId = Object.fromEntries(DEMO_SCENARIOS.map((scenario) => [scenario.id, scenario.data]));
    expect(getActiveSteps(byId['personal-salaried']).map((step) => step.id)).not.toContain('coApplicant');
    expect(getActiveSteps(byId['home-joint']).map((step) => step.id)).toContain('coApplicant');
    expect(byId['business-owner'].address.yearsAtCurrentAddress).toBe(0);
    expect(needsHighEmiAcknowledgement(byId['personal-high-emi'])).toBe(true);
    expect(needsHighEmiAcknowledgement(byId['home-joint'])).toBe(false);
  });
});
