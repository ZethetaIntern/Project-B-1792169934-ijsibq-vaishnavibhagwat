type ClassValue = string | false | null | undefined | 0;

/** Joins truthy class names. Tiny stand-in for `clsx` — no dependency required. */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ');
}
