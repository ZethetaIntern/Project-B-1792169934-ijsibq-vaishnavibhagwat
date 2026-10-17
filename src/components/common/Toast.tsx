import {
  CircleAlert, CircleCheck, Info, TriangleAlert, X,
} from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '../../utils/cn';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export interface ToastOptions {
  /** Toasts with the same id replace each other (e.g. repeated "Draft saved"). */
  id?: string;
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Auto-dismiss delay in ms. `0` keeps the toast until dismissed. */
  duration?: number;
}

interface ToastItem extends Required<Omit<ToastOptions, 'description'>> {
  description?: string;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_ICON: Record<ToastTone, ReactNode> = {
  info: <Info aria-hidden="true" className="size-5 text-cobalt" />,
  success: <CircleCheck aria-hidden="true" className="size-5 text-success" />,
  warning: <TriangleAlert aria-hidden="true" className="size-5 text-warning" />,
  danger: <CircleAlert aria-hidden="true" className="size-5 text-danger" />,
};

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    toastCounter += 1;
    const item: ToastItem = {
      id: options.id ?? `toast-${toastCounter}`,
      title: options.title,
      description: options.description,
      tone: options.tone ?? 'info',
      duration: options.duration ?? 4000,
    };
    setToasts((current) => {
      const others = current.filter((existing) => existing.id !== item.id);
      return [...others, item].slice(-3);
    });
    window.clearTimeout(timers.current.get(item.id));
    if (item.duration > 0) {
      timers.current.set(item.id, window.setTimeout(() => dismiss(item.id), item.duration));
    }
    return item.id;
  }, [dismiss]);

  useEffect(() => {
    const activeTimers = timers.current;
    return () => activeTimers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-relevant="additions text"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-card border border-line bg-surface/95 px-4 py-3 shadow-raised backdrop-blur',
            )}
          >
            <span className="mt-0.5 shrink-0">{TONE_ICON[item.tone]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{item.title}</p>
              {item.description && <p className="mt-0.5 text-[13px] text-slate">{item.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Dismiss notification"
              className="-my-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-ink/5 hover:text-ink sm:pointer-fine:-my-1 sm:pointer-fine:size-9"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>.');
  return context;
}
