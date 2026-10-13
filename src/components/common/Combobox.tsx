import {
  forwardRef,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';
import { cn } from '../../utils/cn';
import { mergeRefs } from '../../utils/inputFormatting';
import { useFieldContext } from './FieldContext';
import { Input, type TextFieldProps } from './Input';

const MAX_SUGGESTIONS = 8;

/** Sets an input's value the way a user would, so React and `register()` both see it. */
function setNativeValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function rank(options: readonly string[], query: string): string[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const starts = options.filter((option) => option.toLowerCase().startsWith(needle));
  const contains = options.filter(
    (option) => !starts.includes(option) && option.toLowerCase().includes(needle),
  );
  return [...starts, ...contains].slice(0, MAX_SUGGESTIONS);
}

export interface ComboboxProps extends TextFieldProps {
  options: readonly string[];
}

interface ListboxProps {
  id: string;
  options: string[];
  activeIndex: number;
  optionId: (index: number) => string;
  onPick: (option: string) => void;
  onHover: (index: number) => void;
}

function Listbox({
  id, options, activeIndex, optionId, onPick, onHover,
}: ListboxProps) {
  const { labelId } = useFieldContext('Combobox');
  return (
    <ul
      id={id}
      role="listbox"
      aria-labelledby={labelId}
      className="absolute top-full z-30 mt-1.5 max-h-64 w-full animate-fade-in overflow-auto rounded-field border border-line bg-surface p-1 shadow-raised"
    >
      {options.map((option, index) => (
        // Operated through the input's key handler (APG combobox pattern).
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events
        <li
          key={option}
          id={optionId(index)}
          role="option"
          aria-selected={index === activeIndex}
          className={cn(
            'flex min-h-11 cursor-pointer items-center rounded-lg px-3 text-[15px] text-ink',
            index === activeIndex && 'bg-cobalt-tint',
          )}
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => onHover(index)}
          onClick={() => onPick(option)}
        >
          {option}
        </li>
      ))}
    </ul>
  );
}

/**
 * Editable combobox with list autocomplete (WAI-ARIA APG pattern): type to filter,
 * ArrowUp/ArrowDown to move, Enter to choose, Escape to close. Free text is allowed.
 * Works uncontrolled with `register()` and controlled with `value`/`onChange`.
 */
export const Combobox = forwardRef<HTMLInputElement, ComboboxProps>((
  {
    options,
    label,
    error,
    helpText,
    optional,
    isValid,
    id,
    fieldClassName,
    onChange,
    onBlur,
    onKeyDown,
    ...inputProps
  },
  ref,
) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const mergedRef = useMemo(() => mergeRefs(ref, inputRef), [ref]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const suggestions = useMemo(() => rank(options, query), [options, query]);
  const expanded = open && suggestions.length > 0;
  const baseId = `${id ?? 'combobox'}-${label}`.replace(/\W+/g, '-');
  const listId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const pick = (option: string) => {
    if (inputRef.current) setNativeValue(inputRef.current, option);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    setOpen(true);
    setActiveIndex(-1);
    onChange?.(event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!expanded) {
        setQuery(event.currentTarget.value);
        setOpen(true);
        return;
      }
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((index) => (index + delta + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter' && expanded && activeIndex >= 0) {
      event.preventDefault(); // choose the suggestion instead of submitting the step
      pick(suggestions[activeIndex]);
    } else if (event.key === 'Escape' && expanded) {
      event.preventDefault();
      setOpen(false);
    }
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    setOpen(false);
    onBlur?.(event);
  };

  return (
    <Input id={id} error={error} optional={optional} isValid={isValid} className={fieldClassName}>
      <Input.Label>{label}</Input.Label>
      {helpText && <Input.HelpText>{helpText}</Input.HelpText>}
      <div className="relative">
        <Input.Field
          {...inputProps}
          ref={mergedRef}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          autoComplete="off"
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
        />
        {expanded && (
          <Listbox
            id={listId}
            options={suggestions}
            activeIndex={activeIndex}
            optionId={optionId}
            onPick={pick}
            onHover={setActiveIndex}
          />
        )}
      </div>
      <Input.Error />
    </Input>
  );
});

Combobox.displayName = 'Combobox';
