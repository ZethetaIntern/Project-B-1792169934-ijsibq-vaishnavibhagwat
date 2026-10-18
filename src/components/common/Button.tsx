import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Replaces the label while loading, e.g. "Submitting…". */
  loadingText?: ReactNode;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-white shadow-[0_1px_0_0_rgb(255_255_255/0.12)_inset,0_1px_2px_0_rgb(11_27_51/0.24)] hover:bg-brand-hover disabled:bg-[#9aa7b6] disabled:shadow-none',
  secondary:
    'border border-line-strong bg-surface text-ink shadow-hairline hover:border-ink-soft/60 hover:bg-canvas disabled:text-muted',
  ghost: 'text-ink hover:bg-ink/[0.05] disabled:text-muted',
  danger: 'bg-danger-ink text-white hover:bg-[#962217] disabled:bg-[#d9a29c]',
  link: 'text-cobalt underline-offset-4 hover:text-cobalt-hover hover:underline disabled:text-muted',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  // Small buttons keep the 44px touch target on touch screens; only a mouse gets 36px.
  sm: 'h-11 gap-1.5 px-3 text-sm sm:pointer-fine:h-9',
  md: 'h-11 gap-2 px-4 text-[15px]',
  lg: 'h-12 gap-2 px-6 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>((
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingText,
    leadingIcon,
    trailingIcon,
    fullWidth = false,
    disabled,
    type = 'button',
    className,
    children,
    ...buttonProps
  },
  ref,
) => (
  <button
    {...buttonProps}
    ref={ref}
    // eslint-disable-next-line react/button-has-type -- type is constrained by ButtonHTMLAttributes
    type={type}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={cn(
      'group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-field font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow,scale] duration-150 ease-out-quart select-none',
      // Press feedback: the whole button, label and icons, gives slightly.
      'active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100',
      variant !== 'link' && SIZE_CLASSES[size],
      // Links get no padding but keep the 44px touch target on touch screens.
      variant === 'link' && 'min-h-11 gap-1.5 text-[15px] sm:pointer-fine:min-h-0',
      VARIANT_CLASSES[variant],
      fullWidth && 'w-full',
      className,
    )}
  >
    {loading ? <Spinner className="size-4" /> : leadingIcon}
    <span>{loading && loadingText ? loadingText : children}</span>
    {!loading && trailingIcon && (
      // Forward arrows lean the way they point while the pointer is over the button.
      <span className="flex transition-transform duration-200 ease-out-quart group-hover/button:translate-x-0.5 group-disabled/button:translate-x-0">
        {trailingIcon}
      </span>
    )}
  </button>
));

Button.displayName = 'Button';
