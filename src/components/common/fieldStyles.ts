/** Shared visual language for every text-like control (inputs, selects, comboboxes). */
export const FIELD_CONTROL_CLASS = [
  'block h-11 w-full min-w-0 rounded-field border border-line-strong bg-surface px-3.5',
  'text-[15px] text-ink shadow-hairline transition-[border-color,box-shadow] duration-150',
  'placeholder:text-muted',
  'hover:border-ink-soft/60',
  'focus:border-cobalt focus:shadow-focus focus:outline-none focus-visible:outline-none',
  'aria-[invalid=true]:border-danger-ink aria-[invalid=true]:focus:shadow-[0_0_0_3px_rgb(179_41_29/0.2)]',
  'disabled:cursor-not-allowed disabled:bg-canvas-sunken disabled:text-muted',
  'read-only:bg-canvas',
].join(' ');

export const FIELD_LABEL_CLASS = 'flex items-baseline justify-between gap-3 text-sm font-medium text-ink';

export const FIELD_HELP_CLASS = 'text-[13px] leading-5 text-slate';

export const OPTIONAL_TAG_CLASS = 'shrink-0 text-xs font-normal text-muted';
