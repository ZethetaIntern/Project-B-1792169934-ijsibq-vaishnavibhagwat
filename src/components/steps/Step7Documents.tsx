import { useMemo } from 'react';
import { Controller, FormProvider, useWatch } from 'react-hook-form';
import { useApplicationStore } from '../../store/applicationStore';
import { getChecklistStatus, getDocumentRequirements } from '../../utils/documentRequirements';
import { Callout } from '../common/Callout';
import { FileUpload } from '../common/FileUpload';
import { FormSection } from '../common/FormSection';
import { SignatureCanvas } from '../common/SignatureCanvas';
import { ChecklistBadge, DocumentChecklist, documentAnchorId } from '../documents/DocumentChecklist';
import { useFieldStatus } from '../wizard/useFieldStatus';
import { useStepForm } from '../wizard/useStepForm';

export default function Step7Documents() {
  const form = useStepForm('documents');
  const { control, setValue } = form;
  const status = useFieldStatus(form);
  const application = useApplicationStore((state) => state.data);
  // Step 1 loan type, Step 3 PAN status and Step 5 employment decide the list.
  const requirements = useMemo(() => getDocumentRequirements(application), [application]);
  const [files, signature] = useWatch({ control, name: ['files', 'signature'] });

  return (
    <FormProvider {...form}>
      <div className="flex flex-col gap-10">
        <Callout tone="privacy" title="Your files stay on this device">
          Images are compressed before upload to save data. In this demo nothing is sent to a
          server: files are encrypted and kept in this browser so you can resume after a crash,
          and document checks are simulated.
        </Callout>

        <DocumentChecklist
          requirements={requirements}
          files={files ?? {}}
          signed={Boolean(signature)}
        />

        <FormSection title="Upload documents" description="Accepted formats and size limits are listed under each document.">
          <div className="flex flex-col divide-y divide-line-soft">
            {requirements.map((requirement) => {
              const { spec } = requirement;
              return (
                <div key={spec.id} id={documentAnchorId(spec.id)} className="scroll-mt-4 py-6 first:pt-0 last:pb-0">
                  <Controller
                    control={control}
                    name={`files.${spec.id}`}
                    render={({ field }) => (
                      <FileUpload
                        name={spec.id}
                        label={spec.label}
                        hint={(
                          <>
                            {spec.hint}
                            {' '}
                            <span className="text-muted">{requirement.reason}</span>
                          </>
                        )}
                        optional={!requirement.required}
                        rules={spec}
                        files={field.value ?? []}
                        onChange={(next) => {
                          field.onChange(next);
                          field.onBlur();
                        }}
                        error={status(`files.${spec.id}`).error}
                        status={(
                          <ChecklistBadge status={getChecklistStatus(requirement, field.value)} />
                        )}
                      />
                    )}
                  />
                </div>
              );
            })}
          </div>
        </FormSection>

        <FormSection
          title="Sign your application"
          description="Your signature is added to the application you submit on the next step."
        >
          <div id={documentAnchorId('signature')} className="scroll-mt-4">
            <Controller
              control={control}
              name="signature"
              render={({ field }) => (
                <SignatureCanvas
                  label="Your signature"
                  description="Draw with a mouse, finger or stylus — or switch to Type."
                  value={field.value}
                  onChange={(dataUrl, method) => {
                    field.onChange(dataUrl);
                    setValue('signatureMethod', method);
                    field.onBlur();
                  }}
                  defaultTypedName={application.personal.fullName}
                  error={status('signature').error}
                />
              )}
            />
          </div>
        </FormSection>
      </div>
    </FormProvider>
  );
}
