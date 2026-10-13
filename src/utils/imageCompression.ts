import { BYTES_PER_MB } from '../constants/documents';

/** Compression settings from the brief (C4). */
export const COMPRESSION_MAX_WIDTH = 1200;
export const COMPRESSION_TARGET_BYTES = 2 * BYTES_PER_MB;
export const COMPRESSION_START_QUALITY = 0.7;
export const COMPRESSION_MIN_QUALITY = 0.3;
export const COMPRESSION_QUALITY_STEP = 0.1;

export interface CompressionResult {
  file: File;
  originalSize: number;
  size: number;
  /** False when the original was already the smaller (or only) option. */
  compressed: boolean;
  quality: number | null;
}

export function isCompressibleImage(file: Blob): boolean {
  return file.type === 'image/jpeg' || file.type === 'image/png';
}

/** Decodes an image file. The object URL is revoked as soon as it has loaded. */
function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('This image could not be read. It may be damaged.'));
    image.src = url;
  }).finally(() => URL.revokeObjectURL(url));
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('This image could not be compressed.'))),
      'image/jpeg',
      quality,
    );
  });
}

const toJpegName = (name: string) => `${name.replace(/\.[^./]+$/, '') || 'image'}.jpg`;

/**
 * Shrinks a JPG/PNG on the device before upload, as specified in C4:
 * scale to at most 1200 px wide (keeping the aspect ratio), encode as JPEG at
 * quality 0.7, then step the quality down by 0.1 until the file is under 2 MB or
 * quality reaches 0.3. PDFs are never passed through here.
 *
 * `toBlob` encodes asynchronously, so the page stays responsive between steps.
 */
export async function compressImage(file: File): Promise<CompressionResult> {
  const unchanged: CompressionResult = {
    file, originalSize: file.size, size: file.size, compressed: false, quality: null,
  };
  if (!isCompressibleImage(file)) return unchanged;

  const image = await loadImage(file);
  const scale = Math.min(1, COMPRESSION_MAX_WIDTH / image.naturalWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) return unchanged;
  // JPEG has no transparency: paint PNGs onto white instead of black.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  // Work in whole tenths so 0.7 → 0.3 never drifts through floating-point error.
  const minTenths = Math.round(COMPRESSION_MIN_QUALITY * 10);
  const stepTenths = Math.round(COMPRESSION_QUALITY_STEP * 10);
  let tenths = Math.round(COMPRESSION_START_QUALITY * 10);
  let blob = await canvasToJpeg(canvas, tenths / 10);
  while (blob.size > COMPRESSION_TARGET_BYTES && tenths - stepTenths >= minTenths) {
    tenths -= stepTenths;
    // eslint-disable-next-line no-await-in-loop -- each attempt depends on the previous size
    blob = await canvasToJpeg(canvas, tenths / 10);
  }
  // Release the bitmap memory straight away (matters on low-end phones).
  canvas.width = 0;
  canvas.height = 0;

  // A small, already-optimised image can come out larger; keep the original then.
  if (blob.size >= file.size && scale === 1) return unchanged;
  return {
    file: new File([blob], toJpegName(file.name), { type: 'image/jpeg', lastModified: Date.now() }),
    originalSize: file.size,
    size: blob.size,
    compressed: true,
    quality: tenths / 10,
  };
}
