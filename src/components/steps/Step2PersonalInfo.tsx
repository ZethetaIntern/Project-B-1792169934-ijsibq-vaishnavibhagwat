import { BadgeCheck, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useWatch } from 'react-hook-form';
import { GENDER_LABELS, MARITAL_STATUS_LABELS, toOptions } from '../../constants/labels';
import { MIN_APPLICANT_AGE } from '../../constants/loan';
import { useOtpVerification } from '../../hooks/useOtpVerification';
import { isoDateYearsAgo } from '../../utils/dates';
import {
  formatPreservingCaret, isDigit, type InputFormatter,
} from '../../utils/inputFormatting';
import {
  isValidEmail, isValidIndianMobile, normalizeIndianMobile,
} from '../../utils/validators';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { FormSection } from '../common/FormSection';
import { TextField } from '../common/Input';
import { OtpPanel } from '../common/OtpPanel';
import { RadioGroup } from '../common/RadioGroup';
import { Select } from '../common/Select';
import { useFieldStatus } from '../wizard/useFieldStatus';
import { useStepForm } from '../wizard/useStepForm';
import { useWizardNavigation } from '../wizard/WizardNavigationContext';

const GENDER_OPTIONS = toOptions(GENDER_LABELS);
const MARITAL_OPTIONS = toOptions(MARITAL_STATUS_LABELS);

/** Accepts typed or pasted numbers (+91, leading 0, spaces) and keeps 10 digits. */
const formatMobile: InputFormatter = (raw) => normalizeIndianMobile(raw).slice(0, 10);

const VerifiedBadge = (
  <Badge tone="success" icon={<BadgeCheck aria-hidden="true" className="size-3.5" />} className="mr-2">
    {/* Icon-only on narrow screens so the number stays readable; still announced. */}
    <span className="max-sm:sr-only">Verified</span>
  </Badge>
);

export default function Step2PersonalInfo() {
  const form = useStepForm('personal');
  const {
    register, control, getValues, setValue, setFocus, trigger,
  } = form;
  const status = useFieldStatus(form);
  const { goTo } = useWizardNavigation();
  const mobileOtp = useOtpVerification();
  const emailOtp = useOtpVerification();
  const [verifiedNotice, setVerifiedNotice] = useState('');

  // The code panel (and the focus inside it) disappears once a code is accepted,
  // so focus returns to the verified field and the result is announced.
  const confirmVerified = (field: 'mobile' | 'email', notice: string) => {
    setFocus(field);
    setVerifiedNotice(notice);
  };

  const [mobile, email, mobileVerified, emailVerified] = useWatch({
    control,
    name: ['mobile', 'email', 'mobileVerified', 'emailVerified'],
  });

  const formatOnInput = (event: FormEvent<HTMLInputElement>) => {
    formatPreservingCaret(event.currentTarget, formatMobile, isDigit);
  };

  // Editing a verified value invalidates the verification.
  const mobileField = register('mobile', {
    onChange: () => {
      if (getValues('mobileVerified')) setValue('mobileVerified', false);
      mobileOtp.reset();
    },
  });
  const emailField = register('email', {
    onChange: () => {
      if (getValues('emailVerified')) setValue('emailVerified', false);
      emailOtp.reset();
    },
  });

  const startMobileVerification = async () => {
    if (!isValidIndianMobile(normalizeIndianMobile(mobile))) {
      trigger('mobile');
      return;
    }
    mobileOtp.send();
  };

  const startEmailVerification = () => {
    if (!isValidEmail(email.trim())) {
      trigger('email');
      return;
    }
    emailOtp.send();
  };

  const dobStatus = status('dateOfBirth');
  const dobNeedsTenureChange = dobStatus.error?.includes('Step 1');

  const verifyButton = (onClick: () => void, sending: boolean, label: string) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      loading={sending}
      loadingText="Sending…"
      leadingIcon={<Send aria-hidden="true" className="size-3.5" />}
      className="mr-0.5 text-cobalt hover:text-cobalt-hover"
      aria-label={label}
    >
      Verify
    </Button>
  );

  return (
    <div className="flex flex-col gap-10">
      <FormSection title="Identity" description="Use your name exactly as printed on your PAN card.">
        <TextField
          {...register('fullName')}
          label="Full name (as per PAN)"
          autoComplete="name"
          maxLength={100}
          {...status('fullName')}
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <TextField
              {...register('dateOfBirth')}
              type="date"
              label="Date of birth"
              autoComplete="bday"
              max={isoDateYearsAgo(MIN_APPLICANT_AGE)}
              min="1940-01-01"
              helpText="You must be 21–65 years old."
              {...dobStatus}
            />
            {dobNeedsTenureChange && (
              <Button variant="link" onClick={() => goTo('loan')} className="self-start">
                Adjust tenure in Step 1
              </Button>
            )}
          </div>
          <Select
            {...register('maritalStatus')}
            label="Marital status"
            placeholder="Select"
            options={MARITAL_OPTIONS}
            {...status('maritalStatus')}
          />
        </div>
        <RadioGroup
          {...register('gender')}
          legend="Gender"
          options={GENDER_OPTIONS}
          autoComplete="sex"
          error={status('gender').error}
        />
      </FormSection>

      <FormSection title="Family">
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField {...register('fatherName')} label="Father's name" autoComplete="off" maxLength={100} {...status('fatherName')} />
          <TextField {...register('motherName')} label="Mother's name" autoComplete="off" maxLength={100} {...status('motherName')} />
        </div>
      </FormSection>

      <FormSection
        title="Contact"
        description="We will use these for updates about this application only. Verification codes are simulated."
      >
        <div className="flex flex-col gap-3">
          <TextField
            {...mobileField}
            onInput={formatOnInput}
            type="tel"
            inputMode="numeric"
            label="Mobile number"
            autoComplete="tel-national"
            helpText="10 digits, starting with 6, 7, 8 or 9. We'll send a one-time code."
            startAdornment="+91"
            startPaddingClass="pl-12"
            endAdornment={mobileVerified
              ? VerifiedBadge
              : verifyButton(startMobileVerification, mobileOtp.status === 'sending', 'Verify mobile number')}
            endPaddingClass="pr-24 sm:pr-28"
            {...status('mobile')}
          />
          <OtpPanel
            otp={mobileOtp}
            destination={`+91 ${normalizeIndianMobile(mobile)}`}
            onVerified={() => {
              setValue('mobileVerified', true);
              trigger('mobile');
              confirmVerified('mobile', 'Mobile number verified.');
            }}
          />
        </div>

        <div className="flex flex-col gap-3">
          <TextField
            {...emailField}
            type="email"
            label="Email address"
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            helpText={emailVerified ? undefined : 'Verifying your email is optional but speeds up approval.'}
            endAdornment={emailVerified
              ? VerifiedBadge
              : verifyButton(startEmailVerification, emailOtp.status === 'sending', 'Verify email address')}
            endPaddingClass="pr-24 sm:pr-28"
            {...status('email')}
          />
          <OtpPanel
            otp={emailOtp}
            destination={email.trim()}
            onVerified={() => {
              setValue('emailVerified', true);
              confirmVerified('email', 'Email address verified.');
            }}
          />
        </div>

        <TextField
          {...register('alternateMobile')}
          onInput={formatOnInput}
          type="tel"
          inputMode="numeric"
          label="Alternate mobile number"
          optional
          autoComplete="tel-national"
          startAdornment="+91"
          startPaddingClass="pl-12"
          helpText="Must be different from your primary number."
          {...status('alternateMobile')}
        />
        <p role="status" className="sr-only">{verifiedNotice}</p>
      </FormSection>
    </div>
  );
}
