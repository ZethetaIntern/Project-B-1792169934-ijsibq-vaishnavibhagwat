import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { BYTES_PER_MB } from '../constants/documents';
import { compressImage, isCompressibleImage } from './imageCompression';

/** Simulated JPEG sizes by quality: the "photo" only fits under 2 MB at quality 0.4. */
const SIZE_AT_QUALITY: Record<string, number> = {
  0.7: 3.4 * BYTES_PER_MB,
  0.6: 2.9 * BYTES_PER_MB,
  0.5: 2.3 * BYTES_PER_MB,
  0.4: 1.8 * BYTES_PER_MB,
  0.3: 1.2 * BYTES_PER_MB,
};

let imageSize = { width: 4000, height: 3000 };
let sizeAtQuality = SIZE_AT_QUALITY;
const drawImage = vi.fn();
const qualities: number[] = [];

class FakeImage {
  onload: (() => void) | null = null;

  onerror: (() => void) | null = null;

  naturalWidth = imageSize.width;

  naturalHeight = imageSize.height;

  set src(_url: string) {
    queueMicrotask(() => this.onload?.());
  }
}

beforeEach(() => {
  imageSize = { width: 4000, height: 3000 };
  sizeAtQuality = SIZE_AT_QUALITY;
  qualities.length = 0;
  vi.stubGlobal('Image', FakeImage);
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    fillRect: vi.fn(), drawImage, fillStyle: '',
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback, _type, quality) => {
    qualities.push(quality ?? 0);
    const bytes = sizeAtQuality[String(quality)] ?? 1000;
    callback(new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' }));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const photo = (size: number, type = 'image/png') => new File([new Uint8Array(size)], 'scan.png', { type });

describe('compressImage', () => {
  it('scales to 1200px wide and lowers quality by 0.1 until under 2 MB', async () => {
    const result = await compressImage(photo(4.5 * BYTES_PER_MB));

    expect(drawImage).toHaveBeenLastCalledWith(expect.anything(), 0, 0, 1200, 900);
    expect(qualities).toEqual([0.7, 0.6, 0.5, 0.4]);
    expect(result).toMatchObject({
      compressed: true, quality: 0.4, originalSize: 4.5 * BYTES_PER_MB,
    });
    expect(result.size).toBeLessThan(2 * BYTES_PER_MB);
    expect(result.file.type).toBe('image/jpeg');
    expect(result.file.name).toBe('scan.jpg');
  });

  it('stops at quality 0.3 even if the image is still large', async () => {
    sizeAtQuality = { ...SIZE_AT_QUALITY, 0.4: 2.2 * BYTES_PER_MB, 0.3: 2.1 * BYTES_PER_MB };
    const result = await compressImage(photo(6 * BYTES_PER_MB));
    expect(qualities).toEqual([0.7, 0.6, 0.5, 0.4, 0.3]);
    expect(result.quality).toBe(0.3);
  });

  it('keeps a small image that would not get smaller', async () => {
    imageSize = { width: 800, height: 600 };
    sizeAtQuality = { 0.7: 90_000 };
    const original = photo(50_000, 'image/jpeg');
    const result = await compressImage(original);
    expect(result).toMatchObject({ compressed: false, file: original, size: 50_000 });
  });

  it('never touches PDFs and revokes every object URL it creates', async () => {
    const pdf = new File(['%PDF-1.7'], 'statement.pdf', { type: 'application/pdf' });
    expect(isCompressibleImage(pdf)).toBe(false);
    expect((await compressImage(pdf)).file).toBe(pdf);
    expect(URL.createObjectURL).not.toHaveBeenCalled();

    await compressImage(photo(3 * BYTES_PER_MB));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });
});
