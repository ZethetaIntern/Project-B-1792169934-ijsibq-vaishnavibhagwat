import { Check, ChevronDown } from 'lucide-react';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from '../../utils/cn';
import { controlAriaProps, useFieldContext } from './FieldContext';
import { FIELD_CONTROL_CLASS } from './fieldStyles';
import { Input } from './Input';
import type { SelectOption } from './Select';

/** Event shape React Hook Form's `register().onChange` understands. */
export interface SelectMenuChangeEvent {
  target: { name: string; value: string };
  type: 'change';
}

export interface SelectMenuHandle {
  focus: () => void;
  name: string;
}

interface SelectMenuControlProps {
  name: string;
  options: readonly SelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (event: SelectMenuChangeEvent) => void;
  onBlur?: (event: { target: { name: string }; type: 'blur' }) => void;
}

const SelectMenuControl = forwardRef<SelectMenuHandle, SelectMenuControlProps>(
  (
    {
      name, options, value, defaultValue = '', placeholder = 'Select…', disabled, onChange, onBlur,
    },
    ref,
  ) => {
    const context = useFieldContext('SelectMenu');
    const buttonRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const [internalValue, setInternalValue] = useState(defaultValue);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const typeahead = useRef({ text: '', timer: 0 });

    const currentValue = value ?? internalValue;
    const selectedIndex = options.findIndex((option) => String(option.value) === currentValue);
    const listId = `${context.fieldId}-listbox`;
    const optionId = (index: number) => `${context.fieldId}-option-${index}`;

    useImperativeHandle(ref, () => ({ focus: () => buttonRef.current?.focus(), name }), [name]);

    useEffect(() => {
      if (!open || activeIndex < 0) return;
      const optionEl = listRef.current?.querySelector<HTMLElement>(`#${CSS.escape(optionId(activeIndex))}`);
      optionEl?.scrollIntoView?.({ block: 'nearest' });
      // optionId is derived from stable ids
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, activeIndex]);

    const openMenu = (index = selectedIndex >= 0 ? selectedIndex : 0) => {
      setOpen(true);
      setActiveIndex(index);
    };

    const commit = (index: number) => {
      const option = options[index];
      if (!option || option.disabled) return;
      const nextValue = String(option.value);
      if (value === undefined) setInternalValue(nextValue);
      onChange?.({ target: { name, value: nextValue }, type: 'change' });
      setOpen(false);
      buttonRef.current?.focus();
    };

    const move = (delta: number) => {
      setActiveIndex((index) => {
        let next = index;
        for (let step = 0; step < options.length; step += 1) {
          next = Math.min(Math.max(next + delta, 0), options.length - 1);
          if (!options[next]?.disabled) return next;
        }
        return index;
      });
    };

    const runTypeahead = (char: string) => {
      window.clearTimeout(typeahead.current.timer);
      typeahead.current.text += char.toLowerCase();
      typeahead.current.timer = window.setTimeout(() => {
        typeahead.current.text = '';
      }, 600);
      const query = typeahead.current.text;
      const match = options.findIndex(
        (option) => !option.disabled && option.label.toLowerCase().startsWith(query),
      );
      if (match >= 0) openMenu(match);
    };

    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
      const { key } = event;
      if (!open) {
        if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(key)) {
          event.preventDefault();
          openMenu();
        } else if (key === 'Home' || key === 'End') {
          event.preventDefault();
          openMenu(key === 'Home' ? 0 : options.length - 1);
        } else if (key.length === 1 && /\S/.test(key)) {
          runTypeahead(key);
        }
        return;
      }
      const handlers: Record<string, () => void> = {
        ArrowDown: () => move(1),
        ArrowUp: () => (event.altKey ? commit(activeIndex) : move(-1)),
        Home: () => setActiveIndex(0),
        End: () => setActiveIndex(options.length - 1),
        Enter: () => commit(activeIndex),
        ' ': () => commit(activeIndex),
        Escape: () => setOpen(false),
      };
      if (handlers[key]) {
        event.preventDefault();
        handlers[key]();
      } else if (key === 'Tab') {
        commit(activeIndex);
      } else if (key.length === 1 && /\S/.test(key)) {
        runTypeahead(key);
      }
    };

    return (
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          role="combobox"
          name={name}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={context.labelId}
          aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          {...controlAriaProps(context)}
          className={cn(FIELD_CONTROL_CLASS, 'flex cursor-pointer items-center pr-10 text-left')}
          onClick={() => (open ? setOpen(false) : openMenu())}
          onKeyDown={onKeyDown}
          onBlur={(event) => {
            if (!listRef.current?.contains(event.relatedTarget)) setOpen(false);
            onBlur?.({ target: { name }, type: 'blur' });
          }}
        >
          <span className={cn('truncate', selectedIndex < 0 && 'text-muted')}>
            {selectedIndex >= 0 ? options[selectedIndex].label : placeholder}
          </span>
        </button>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-slate transition-transform',
            open && 'rotate-180',
          )}
        />
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={context.labelId}
          hidden={!open}
          className="absolute z-30 mt-1.5 max-h-64 w-full animate-fade-in overflow-auto rounded-field border border-line bg-surface p-1 shadow-raised"
        >
          {options.map((option, index) => (
            // Options are operated through the combobox's key handler (APG select-only pattern).
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
            <li
              key={option.value}
              id={optionId(index)}
              role="option"
              aria-selected={index === selectedIndex}
              aria-disabled={option.disabled || undefined}
              className={cn(
                'flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-[15px]',
                index === activeIndex && 'bg-cobalt-tint text-ink',
                option.disabled && 'cursor-not-allowed opacity-50',
              )}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => commit(index)}
            >
              {option.label}
              {index === selectedIndex && (
                <Check aria-hidden="true" className="size-4 text-cobalt" />
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  },
);

export interface SelectMenuProps extends SelectMenuControlProps {
  label: ReactNode;
  id?: string;
  error?: string;
  helpText?: ReactNode;
  optional?: boolean;
  isValid?: boolean;
  fieldClassName?: string;
}

/**
 * Custom dropdown following the WAI-ARIA "select-only combobox" pattern: focus stays on
 * the trigger, `aria-activedescendant` tracks the highlighted option, and it supports
 * arrow keys, Home/End, type-ahead, Enter/Space, Escape and Tab. Works controlled
 * (`value` + `onChange`) or uncontrolled with React Hook Form's `register()`.
 */
export const SelectMenu = forwardRef<SelectMenuHandle, SelectMenuProps>((
  {
    label, id, error, helpText, optional, isValid, fieldClassName, ...controlProps
  },
  ref,
) => (
  <Input id={id} error={error} optional={optional} isValid={isValid} className={fieldClassName}>
    <Input.Label>{label}</Input.Label>
    {helpText && <Input.HelpText>{helpText}</Input.HelpText>}
    <SelectMenuControl ref={ref} {...controlProps} />
    <Input.Error />
  </Input>
));
