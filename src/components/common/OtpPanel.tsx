import { KeyRound, RotateCcw } from 'lucide-react';
import { useId, useState, type KeyboardEvent } from 'react';
import { OTP_LENGTH, type useOtpVerification } from '../../hooks/useOtpVerification';
import { digitsOnly } from '../../utils/inputFormatting';
import { Button } from './Button';
import { ErrorMessage } from './ErrorMessage';
import { FIELD_CONTROL_CLASS } from './fieldStyles';

interface OtpPanelProps {
  otp: ReturnType<typeof useOtpVerification>;
  /** Where the code was "sent", e.g. "+91 98765 43210". */
  destination: string;
  onVerified: () => void;
}

/**
 * Inline one-time-password entry. Not part of the step form: the code is never
 * submitted with the application or saved — only the resulting "verified" flag is.
 */
export function OtpPanel({ otp, destination, onVerified }: OtpPanelProps) {
  const [code, setCode] = useState('');
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();

  if (otp.status !== 'sent' && otp.status !== 'verifying') return null;

  const submit = async () => {
    if (await otp.verify(code)) onVerified();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Enter verifies the code instead of submitting the whole step.
    if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex animate-fade-in flex-col gap-3 rounded-card border border-cobalt/25 bg-cobalt-tint/50 p-4">
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        {`Enter the ${OTP_LENGTH}-digit code sent to ${destination}`}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={inputId}
          // Focus follows the user's own "Send code" action.
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          value={code}
          onChange={(event) => setCode(digitsOnly(OTP_LENGTH)(event.target.value))}
          onKeyDown={onKeyDown}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={OTP_LENGTH}
          aria-invalid={otp.error ? true : undefined}
          aria-describedby={`${hintId} ${otp.error ? errorId : ''}`.trim()}
          className={`${FIELD_CONTROL_CLASS} font-medium tracking-[0.4em] sm:max-w-48`}
        />
        <Button
          onClick={submit}
          loading={otp.status === 'verifying'}
          loadingText="Checking…"
          leadingIcon={<KeyRound aria-hidden="true" className="size-4" />}
        >
          Verify code
        </Button>
      </div>
      <ErrorMessage id={errorId} message={otp.error ?? undefined} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <p id={hintId} className="text-slate">
          <span className="font-medium text-ink-soft">Demo mode:</span>
          {' no message is sent. Your code is '}
          <strong className="font-semibold text-ink tabular" data-testid="demo-otp">{otp.demoCode}</strong>
          .
        </p>
        <Button
          variant="link"
          onClick={() => {
            setCode('');
            otp.send();
          }}
          disabled={otp.secondsUntilResend > 0}
          leadingIcon={<RotateCcw aria-hidden="true" className="size-3.5" />}
        >
          {otp.secondsUntilResend > 0 ? `Resend in ${otp.secondsUntilResend}s` : 'Resend code'}
        </Button>
      </div>
    </div>
  );
}
