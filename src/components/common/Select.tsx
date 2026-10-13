import { ChevronDown } from 'lucide-react';
import { forwardRef, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { controlAriaProps, useFieldContext } from './FieldContext';
import { FIELD_CONTROL_CLASS } from './fieldStyles';
import { Input } from './Input';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface NativeControlProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: readonly SelectOption[];
  placeholder?: string;
}

const NativeControl = forwardRef<HTMLSelectElement, NativeControlProps>((
  {
    options, placeholder, className, 'aria-describedby': ariaDescribedBy, ...selectProps
  },
  ref,
) => {
  const context = useFieldContext('Select');
  return (
    <div className="relative">
      <select
        {...selectProps}
        {...controlAriaProps(context, ariaDescribedBy)}
        ref={ref}
        className={cn(FIELD_CONTROL_CLASS, 'cursor-pointer appearance-none pr-10', className)}
      >
        {placeholder && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-slate"
      />
    </div>
  );
});

export interface SelectProps extends NativeControlProps {
  label: ReactNode;
  error?: string;
  helpText?: ReactNode;
  optional?: boolean;
  isValid?: boolean;
  fieldClassName?: string;
}

/**
 * Native `<select>` styled to match the field system. Native first: it is fully
 * keyboard and screen-reader accessible on every platform and opens the OS picker
 * on mobile. For the custom popover variant see `SelectMenu`.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>((
  {
    label, error, helpText, optional, isValid, id, fieldClassName, ...controlProps
  },
  ref,
) => (
  <Input id={id} error={error} optional={optional} isValid={isValid} className={fieldClassName}>
    <Input.Label>{label}</Input.Label>
    {helpText && <Input.HelpText>{helpText}</Input.HelpText>}
    <NativeControl ref={ref} {...controlProps} />
    <Input.Error />
  </Input>
));
