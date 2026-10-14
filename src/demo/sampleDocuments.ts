import type { DocumentTypeId } from '../types/application';

const encoder = new TextEncoder();
/** PDF string literals need backslashes and parentheses escaped. */
const escapePdfText = (text: string) => text.replace(/[\\()]/g, (char) => `\\${char}`);

/**
 * A one-page PDF, written by hand so the demo needs no PDF library. It is a real,
 * valid file (correct header and cross-reference table), so it passes the same
 * content checks as anything a user uploads.
 */
export function createSamplePdf(name: string, title: string): File {
  const lines = ['SAMPLE - synthetic demo document', title, 'LendSwift demo. Not a real document.'];
  const text = lines
    .map((line, index) => `${index === 0 ? '72 770 Td' : '0 -26 Td'} (${escapePdfText(line)}) Tj`)
    .join(' ');
  const stream = `BT /F1 16 Tf ${text} ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let body = '%PDF-1.4\n';
  const offsets = objects.map((object, index) => {
    const offset = body.length;
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xrefOffset = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return new File([encoder.encode(body)], name, { type: 'application/pdf' });
}

/** A placeholder passport photo drawn on a canvas and clearly marked SAMPLE. */
export async function createSamplePhoto(): Promise<File | null> {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 750;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.fillStyle = '#dfe7f1';
  context.fillRect(0, 0, 600, 750);
  context.fillStyle = '#4f596b';
  context.beginPath();
  context.arc(300, 300, 130, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.ellipse(300, 720, 240, 220, 0, Math.PI, 0);
  context.fill();
  context.fillStyle = '#ffffff';
  context.font = '600 56px sans-serif';
  context.textAlign = 'center';
  context.fillText('SAMPLE', 300, 110);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.9);
  });
  return blob ? new File([blob], 'sample-photo.jpg', { type: 'image/jpeg' }) : null;
}

/**
 * Drops sample files into the real uploaders, exactly as if the user had chosen
 * them: they go through validation, compression, progress and the vault.
 */
export async function addSampleDocuments(
  ids: readonly DocumentTypeId[],
  labels: Readonly<Record<string, string>>,
) {
  const photo = ids.includes('photograph') ? await createSamplePhoto() : null;
  ids.forEach((id) => {
    const input = document.querySelector<HTMLInputElement>(`[data-testid="upload-input-${id}"]`);
    const file = id === 'photograph' ? photo : createSamplePdf(`${id}-sample.pdf`, labels[id] ?? id);
    if (!input || !file || typeof DataTransfer === 'undefined') return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
