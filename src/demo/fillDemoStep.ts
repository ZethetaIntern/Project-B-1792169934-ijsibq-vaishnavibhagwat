import { renderTypedSignature } from '../components/common/SignatureCanvas';
import { stepFormBridge } from '../components/wizard/stepFormBridge';
import type {
  ApplicationData, DocumentDetails, DocumentTypeId, StepId,
} from '../types/application';
import { getDocumentRequirements, isDocumentProvided } from '../utils/documentRequirements';
import { addSampleDocuments } from './sampleDocuments';
import type { DemoScenario } from './scenarios';

export interface FillOutcome {
  filled: boolean;
  /** What the person should do next — shown as a toast. */
  message: string;
}

/** What is still the person's job after a fill, per step. */
const NEXT_ACTION: Partial<Record<StepId, string>> = {
  personal: 'Verify the mobile number with the code shown on screen, then press Continue.',
  kyc: 'Select Verify on the PAN and the Aadhaar number, then press Continue.',
  coApplicant: "Verify the co-applicant's PAN and tick their consent, then press Continue.",
};

const nextFrame = () => new Promise<void>((resolve) => {
  window.setTimeout(resolve, 0);
});

/**
 * Fills the open step with the scenario's synthetic answers through the same bridge
 * the wizard uses. Nothing is committed: the person still presses Continue, so
 * every validation rule runs. Verification, OTPs and consents are left to them;
 * sample documents go through the real uploader.
 */
export async function fillDemoStep(
  scenario: DemoScenario,
  application: ApplicationData,
): Promise<FillOutcome> {
  const controller = stepFormBridge.get();
  if (!controller) return { filled: false, message: 'This step is still loading. Try again in a moment.' };
  const { stepId } = controller;

  if (stepId === 'review') {
    return { filled: false, message: 'Consents are yours to give. Tick each one yourself to submit.' };
  }

  if (stepId === 'documents') {
    const current = controller.getValues() as DocumentDetails;
    const name = application.personal.fullName || scenario.data.personal.fullName;
    if (!current.signature) {
      controller.fill({ ...current, signature: renderTypedSignature(name), signatureMethod: 'type' } as never);
    }
    const isMissing = (id: DocumentTypeId) => !isDocumentProvided(id, current.files[id] ?? []);
    const missing = getDocumentRequirements(application)
      .filter(({ required, spec }) => required && isMissing(spec.id));
    await nextFrame();
    await addSampleDocuments(
      missing.map(({ spec }) => spec.id),
      Object.fromEntries(missing.map(({ spec }) => [spec.id, spec.label])),
    );
    return {
      filled: true,
      message: missing.length
        ? `Uploading ${missing.length} sample ${missing.length === 1 ? 'document' : 'documents'} and signing with a typed name. Press Continue when they are verified.`
        : 'Everything is already uploaded. Press Continue.',
    };
  }

  if (stepId === 'coApplicant') {
    const { coApplicant } = scenario.data;
    controller.fill({ ...coApplicant, signature: renderTypedSignature(coApplicant.fullName) });
  } else {
    controller.fill(structuredClone(scenario.data[stepId]));
  }
  return {
    filled: true,
    message: NEXT_ACTION[stepId] ?? 'Filled with synthetic answers. Check them, then press Continue.',
  };
}
