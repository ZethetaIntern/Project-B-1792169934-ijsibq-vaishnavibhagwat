import {
  Eraser, EyeOff, PenLine, RotateCcw, Type,
} from 'lucide-react';
import {
  useEffect, useId, useRef, useState, type CanvasHTMLAttributes,
} from 'react';
import ReactSignatureCanvas from 'react-signature-canvas';
import type { SignatureMethod } from '../../types/application';
import { cn } from '../../utils/cn';
import { Button } from './Button';
import { ErrorMessage } from './ErrorMessage';
import { FIELD_CONTROL_CLASS } from './fieldStyles';

const INK = '#0b1b33';
const PAPER = '#ffffff';
const SIGNATURE_FONT = "'Segoe Script', 'Brush Script MT', 'Snell Roundhand', cursive";

/** Renders a typed name as a signature-style PNG (keyboard-accessible alternative to drawing). */
export function renderTypedSignature(name: string, width = 600, height = 180): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return '';
  context.fillStyle = PAPER;
  context.fillRect(0, 0, width, height);
  context.fillStyle = INK;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  let size = 64;
  do {
    context.font = `italic ${size}px ${SIGNATURE_FONT}`;
    size -= 4;
  } while (context.measureText(name).width > width - 48 && size > 20);
  context.fillText(name, width / 2, height / 2);
  return canvas.toDataURL('image/png');
}

/** Hides the signature while the window is in the background (basic anti-capture measure). */
export function useWindowInactive(): boolean {
  const [inactive, setInactive] = useState(false);
  useEffect(() => {
    const hide = () => setInactive(true);
    const show = () => setInactive(false);
    const onVisibility = () => setInactive(document.visibilityState === 'hidden');
    window.addEventListener('blur', hide);
    window.addEventListener('focus', show);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', hide);
      window.removeEventListener('focus', show);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  return inactive;
}

export function InactiveShield({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-field bg-surface/95 text-sm font-medium text-slate backdrop-blur-sm">
      <EyeOff aria-hidden="true" className="size-4" />
      Signature hidden while this window is inactive
    </div>
  );
}

export interface SignatureCanvasProps {
  label: string;
  /** Confirmed signature as a PNG data URL ('' when none). */
  value: string;
  onChange: (dataUrl: string, method: SignatureMethod | '') => void;
  error?: string;
  /** Pre-fills "Type" mode, e.g. with the applicant's name. */
  defaultTypedName?: string;
  description?: string;
}

/**
 * E-signature capture: draw with mouse, touch or stylus (react-signature-canvas), or
 * type a name for a keyboard-only alternative. The user confirms before the PNG is stored;
 * the canvas resizes with its container without losing strokes.
 */
export function SignatureCanvas({
  label, value, onChange, error, defaultTypedName = '', description,
}: SignatureCanvasProps) {
  const baseId = useId();
  const padRef = useRef<ReactSignatureCanvas>(null);
  const [mode, setMode] = useState<SignatureMethod>('draw');
  const [hasStrokes, setHasStrokes] = useState(false);
  const [typedName, setTypedName] = useState(defaultTypedName);
  const inactive = useWindowInactive();
  const editing = !value;

  // The library only sizes the canvas on mount (or clears it on resize). Instead,
  // match the bitmap to its CSS size × device pixel ratio whenever the layout
  // changes, redrawing the strokes so a rotated phone keeps the signature.
  useEffect(() => {
    const pad = padRef.current;
    if (!editing || mode !== 'draw' || !pad) return undefined;
    const canvas = pad.getCanvas();
    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const width = canvas.offsetWidth * ratio;
      const height = canvas.offsetHeight * ratio;
      if (canvas.width === width && canvas.height === height) return;
      const strokes = pad.toData();
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')?.scale(ratio, ratio);
      pad.fromData(strokes);
    };
    resize();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    observer?.observe(canvas);
    return () => observer?.disconnect();
  }, [editing, mode]);

  const clearDraft = () => {
    padRef.current?.clear();
    setHasStrokes(false);
  };

  const confirm = () => {
    if (mode === 'draw') {
      const pad = padRef.current;
      if (!pad || pad.isEmpty()) return;
      onChange(pad.toDataURL('image/png'), 'draw');
    } else if (typedName.trim()) {
      onChange(renderTypedSignature(typedName.trim()), 'type');
    }
    setHasStrokes(false);
  };

  const canConfirm = mode === 'draw' ? hasStrokes : typedName.trim().length > 1;
  const descriptionId = `${baseId}-description`;
  const errorId = `${baseId}-error`;

  return (
    <div className="flex flex-col gap-3" role="group" aria-labelledby={`${baseId}-label`} aria-describedby={`${description ? descriptionId : ''} ${error ? errorId : ''}`.trim() || undefined}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p id={`${baseId}-label`} className="text-sm font-medium text-ink">{label}</p>
          {description && <p id={descriptionId} className="mt-0.5 text-[13px] text-slate">{description}</p>}
        </div>
        {editing && (
          <div role="group" aria-label="Signature method" className="flex rounded-field bg-canvas-sunken p-1">
            {(['draw', 'type'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={mode === option}
                onClick={() => setMode(option)}
                className={cn(
                  'flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors max-sm:min-h-11',
                  mode === option ? 'bg-surface text-ink shadow-card' : 'text-slate hover:text-ink',
                )}
              >
                {option === 'draw' ? <PenLine aria-hidden="true" className="size-4" /> : <Type aria-hidden="true" className="size-4" />}
                {option === 'draw' ? 'Draw' : 'Type'}
              </button>
            ))}
          </div>
        )}
      </div>

      {!editing ? (
        <div className="flex flex-col gap-3">
          <div className="relative overflow-hidden rounded-field border border-line bg-surface">
            <img src={value} alt={`${label} — captured`} className="mx-auto h-36 w-full object-contain sm:h-40" data-testid="signature-preview" />
            <InactiveShield show={inactive} />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => onChange('', '')} leadingIcon={<RotateCcw aria-hidden="true" className="size-4" />}>
              Redraw signature
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {mode === 'draw' ? (
            <div className={cn('relative rounded-field border bg-surface', error ? 'border-danger-ink' : 'border-line-strong')}>
              <ReactSignatureCanvas
                ref={padRef}
                penColor={INK}
                backgroundColor={PAPER}
                minWidth={0.8}
                maxWidth={2.6}
                clearOnResize={false}
                onEnd={() => setHasStrokes(!padRef.current?.isEmpty())}
                canvasProps={{
                  'aria-label': `${label} pad. Draw with a mouse, finger or stylus, or choose Type to sign with the keyboard.`,
                  className: 'block h-40 w-full touch-none rounded-field sm:h-44',
                  'data-testid': 'signature-canvas',
                } as CanvasHTMLAttributes<HTMLCanvasElement>}
              />
              <span aria-hidden="true" className="pointer-events-none absolute right-6 bottom-9 left-6 border-b border-dashed border-line-strong" />
              {!hasStrokes && (
                <span aria-hidden="true" className="pointer-events-none absolute bottom-3 left-6 text-xs text-muted">Sign above the line</span>
              )}
              <InactiveShield show={inactive} />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <label htmlFor={`${baseId}-typed`} className="text-[13px] text-slate">Type your full name to sign</label>
              <input
                id={`${baseId}-typed`}
                value={typedName}
                onChange={(event) => setTypedName(event.target.value.slice(0, 60))}
                autoComplete="name"
                className={FIELD_CONTROL_CLASS}
              />
              <div className="relative flex h-28 items-center justify-center overflow-hidden rounded-field border border-line bg-surface px-4" aria-hidden="true">
                <span className="truncate text-4xl text-ink italic" style={{ fontFamily: SIGNATURE_FONT }}>{typedName || 'Your name'}</span>
                <InactiveShield show={inactive} />
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={confirm} disabled={!canConfirm} size="sm">Use this signature</Button>
            {mode === 'draw' && (
              <Button variant="ghost" size="sm" onClick={clearDraft} disabled={!hasStrokes} leadingIcon={<Eraser aria-hidden="true" className="size-4" />}>
                Clear
              </Button>
            )}
          </div>
        </div>
      )}
      <ErrorMessage id={errorId} message={error} />
    </div>
  );
}
