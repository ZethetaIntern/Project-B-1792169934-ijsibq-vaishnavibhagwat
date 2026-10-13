import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useRef } from 'react';
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Resolver,
  type UseFormReturn,
} from 'react-hook-form';
import { getStepSchema } from '../../schemas/schemaFactory';
import { useApplicationStore } from '../../store/applicationStore';
import { createEmptyApplication } from '../../store/initialApplication';
import type { ApplicationData, StepId } from '../../types/application';
import { stepFormBridge, type StepController } from './stepFormBridge';

/**
 * Creates the React Hook Form instance for a wizard step and plugs it into the Wizard.
 *
 * - Defaults come from the central store, so returning to a step restores its values.
 * - The resolver uses the step's schema from `schemaFactory`, rebuilt from the whole
 *   application, so cross-step rules always see the latest answers.
 * - `mode: 'onTouched'` shows errors after a field is blurred (never on first
 *   keystroke) and then re-validates as the user corrects it.
 */
export function useStepForm<K extends StepId>(stepId: K): UseFormReturn<ApplicationData[K]> {
  type Values = ApplicationData[K] & FieldValues;

  const application = useApplicationStore((state) => state.data);
  const revision = useApplicationStore((state) => state.revision);
  const replaceSection = useApplicationStore((state) => state.replaceSection);

  const schema = useMemo(() => getStepSchema(stepId, application), [stepId, application]);
  const schemaRef = useRef(schema);
  useEffect(() => {
    schemaRef.current = schema;
  }, [schema]);

  // Stable resolver that always validates against the latest dependency-aware schema.
  const resolver = useMemo<Resolver<Values>>(() => {
    type ResolverResult = ReturnType<Resolver<Values>>;
    return (values, context, options) => {
      const validate = zodResolver(schemaRef.current as never);
      return validate(values, context, options as never) as ResolverResult;
    };
  }, []);

  const form = useForm<Values>({
    defaultValues: application[stepId] as DefaultValues<Values>,
    resolver,
    mode: 'onTouched',
    reValidateMode: 'onChange',
    shouldFocusError: true,
  });

  // Re-sync when the store is hydrated (resume draft) or reset (start fresh).
  const { reset } = form;
  const lastRevision = useRef(revision);
  useEffect(() => {
    if (lastRevision.current === revision) return;
    lastRevision.current = revision;
    reset(useApplicationStore.getState().data[stepId]);
  }, [revision, reset, stepId]);

  useEffect(() => {
    const controller: StepController<K> = {
      stepId,
      validate: async () => {
        let valid = false;
        await form.handleSubmit((parsed) => {
          valid = true;
          // Parsed output only carries the active branch of discriminated unions, so
          // layer it over an empty section: switching e.g. employment type clears
          // the abandoned branch instead of leaking stale data.
          const empty = createEmptyApplication()[stepId];
          replaceSection(stepId, { ...empty, ...parsed });
        })();
        return valid;
      },
      getValues: () => form.getValues(),
      fill: (values) => form.reset(values, { keepDefaultValues: true }),
    };
    stepFormBridge.attach(controller as unknown as StepController);
    return () => stepFormBridge.detach(controller as unknown as StepController);
  }, [form, replaceSection, stepId]);

  return form;
}
