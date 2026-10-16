import { Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { MAX_PREVIOUS_EMPLOYERS } from '../../constants/loan';
import type { EmploymentDetails, PreviousEmployer } from '../../types/application';
import { Button } from '../common/Button';
import { FormSection } from '../common/FormSection';
import { TextField } from '../common/Input';
import { useFieldStatus } from '../wizard/useFieldStatus';
import { formatYears, yearsValue } from './yearsInput';

const EMPTY_JOB: PreviousEmployer = { companyName: '', designation: '', years: null };

/**
 * Optional list of past jobs for salaried applicants, built on `useFieldArray`.
 * Adding a job focuses its company name; removing one returns focus to the
 * add button, and both changes are announced to screen readers.
 */
export function PreviousEmployers() {
  const form = useFormContext<EmploymentDetails>();
  const { control, register } = form;
  const status = useFieldStatus(form);
  const { fields, append, remove } = useFieldArray({ control, name: 'previousEmployers' });
  const addButton = useRef<HTMLButtonElement>(null);
  const [announcement, setAnnouncement] = useState('');
  const full = fields.length >= MAX_PREVIOUS_EMPLOYERS;

  const add = () => {
    append(EMPTY_JOB, { focusName: `previousEmployers.${fields.length}.companyName` });
    setAnnouncement(`Previous employer ${fields.length + 1} added.`);
  };

  const removeAt = (index: number) => {
    remove(index);
    setAnnouncement(`Previous employer ${index + 1} removed.`);
    window.setTimeout(() => addButton.current?.focus(), 0);
  };

  return (
    <FormSection
      title="Previous employers"
      description={`Optional. If you joined your current employer recently, listing up to ${MAX_PREVIOUS_EMPLOYERS} past jobs shows a steady work history.`}
    >
      {fields.length > 0 && (
        <ol className="flex flex-col gap-4">
          {fields.map((field, index) => {
            const headingId = `previous-employer-${field.id}`;
            const name = <K extends keyof PreviousEmployer>(key: K) => `previousEmployers.${index}.${key}` as const;
            return (
              <li key={field.id}>
                <div role="group" aria-labelledby={headingId} className="flex flex-col gap-5 rounded-xl border border-line p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 id={headingId} className="text-sm font-semibold text-ink">
                      {`Previous employer ${index + 1}`}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      leadingIcon={<Trash2 aria-hidden="true" className="size-4" />}
                      onClick={() => removeAt(index)}
                      aria-label={`Remove previous employer ${index + 1}`}
                    >
                      Remove
                    </Button>
                  </div>
                  <TextField
                    {...register(name('companyName'))}
                    label="Company name"
                    autoComplete="off"
                    maxLength={100}
                    {...status(name('companyName'))}
                  />
                  <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_10rem]">
                    <TextField
                      {...register(name('designation'))}
                      label="Job title"
                      autoComplete="off"
                      maxLength={60}
                      {...status(name('designation'))}
                    />
                    <TextField
                      {...register(name('years'), { setValueAs: yearsValue, deps: 'yearsOfExperience' })}
                      onInput={formatYears}
                      label="Years there"
                      inputMode="numeric"
                      maxLength={2}
                      helpText="0 if under a year."
                      helpPosition="below"
                      {...status(name('years'))}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <div className="flex flex-col items-start gap-1.5">
        <Button
          ref={addButton}
          variant="secondary"
          size="sm"
          leadingIcon={<Plus aria-hidden="true" className="size-4" />}
          onClick={add}
          disabled={full}
        >
          {fields.length === 0 ? 'Add a previous employer' : 'Add another'}
        </Button>
        {full && (
          <p className="text-[13px] text-slate">{`You can list up to ${MAX_PREVIOUS_EMPLOYERS} previous employers.`}</p>
        )}
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
    </FormSection>
  );
}
