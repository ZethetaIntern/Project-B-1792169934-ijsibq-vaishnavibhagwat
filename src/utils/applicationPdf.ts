import type { jsPDF as JsPdf } from 'jspdf';
import { getLoanProduct } from '../constants/loan';
import type { SubmissionReceipt } from '../store/applicationStore';
import type { ApplicationData } from '../types/application';
import { getApplicationEstimate } from './applicationMetrics';
import { formatINR, formatTenure } from './format';
import { buildReviewSections } from './reviewSummary';

const PAGE = { width: 595.28, height: 841.89, margin: 48 };
const INK: [number, number, number] = [11, 27, 51];
const SLATE: [number, number, number] = [79, 89, 107];
const LINE: [number, number, number] = [229, 225, 216];

/** The PDF's built-in fonts have no rupee glyph, so amounts use "Rs". */
const pdfText = (value: string) => value.replace(/₹\s?/g, 'Rs ');

/** Small layout helper: a cursor that starts a new page when content would overflow. */
function createWriter(doc: JsPdf) {
  let y = PAGE.margin;
  const contentWidth = PAGE.width - PAGE.margin * 2;

  const ensure = (height: number) => {
    if (y + height <= PAGE.height - PAGE.margin) return;
    doc.addPage();
    y = PAGE.margin;
  };

  return {
    heading(text: string) {
      ensure(40);
      y += 14;
      doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...INK);
      doc.text(text, PAGE.margin, y);
      y += 8;
      doc.setDrawColor(...LINE).line(PAGE.margin, y, PAGE.width - PAGE.margin, y);
      y += 14;
    },
    row(label: string, value: string) {
      const lines = doc.setFontSize(10).splitTextToSize(pdfText(value) || '-', contentWidth * 0.58) as string[];
      ensure(lines.length * 13 + 4);
      doc.setFont('helvetica', 'normal').setTextColor(...SLATE).text(label, PAGE.margin, y);
      doc.setFont('helvetica', 'bold').setTextColor(...INK).text(lines, PAGE.margin + contentWidth * 0.42, y);
      y += lines.length * 13 + 4;
    },
    paragraph(text: string, size = 9) {
      const lines = doc.setFont('helvetica', 'normal').setFontSize(size)
        .splitTextToSize(pdfText(text), contentWidth) as string[];
      ensure(lines.length * (size + 3) + 4);
      doc.setTextColor(...SLATE).text(lines, PAGE.margin, y);
      y += lines.length * (size + 3) + 4;
    },
    image(dataUrl: string, width: number, height: number) {
      ensure(height + 8);
      doc.addImage(dataUrl, 'PNG', PAGE.margin, y, width, height);
      y += height + 8;
    },
    title(text: string, subtitle: string) {
      doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(...INK).text(text, PAGE.margin, y + 8);
      doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...SLATE).text(subtitle, PAGE.margin, y + 26);
      y += 40;
    },
  };
}

/**
 * Builds the downloadable application summary. Sensitive numbers stay masked,
 * exactly as on the review page. jsPDF is imported lazily so it never weighs on
 * the main bundle.
 */
export async function createApplicationSummaryPdf(
  application: ApplicationData,
  receipt: SubmissionReceipt,
): Promise<JsPdf> {
  const { jsPDF: PdfDocument } = await import('jspdf');
  const doc = new PdfDocument({ unit: 'pt', format: 'a4' });
  doc.setProperties({ title: `LendSwift application ${receipt.reference}`, creator: 'LendSwift demo' });
  const write = createWriter(doc);
  const product = getLoanProduct(application.loan.loanType);
  const { estimate } = getApplicationEstimate(application);

  write.title('LendSwift application summary', `Reference ${receipt.reference}`);
  write.paragraph(`Submitted ${new Date(receipt.submittedAt).toLocaleString('en-IN')}. Demo document: no lender received this application and no credit decision has been made. All figures are illustrative estimates.`);

  if (estimate) {
    write.heading('Key facts (indicative)');
    write.row('Loan', product?.label ?? '');
    write.row('Amount', formatINR(estimate.principal));
    write.row('Tenure', `${formatTenure(estimate.tenureMonths)} (${estimate.tenureMonths} instalments)`);
    write.row('Interest rate', `${estimate.annualRate}% p.a., fixed`);
    write.row('APR', `${estimate.apr.toFixed(2)}%`);
    write.row('Monthly instalment (EMI)', formatINR(estimate.emi));
    write.row('Processing fee', formatINR(estimate.processingFee));
    write.row('Total interest', formatINR(estimate.totalInterest));
    write.row('Total amount payable', formatINR(estimate.totalPayable));
  }

  buildReviewSections(application).forEach((section) => {
    write.heading(section.title);
    section.items.forEach((item) => write.row(item.label, item.masked ?? item.value));
  });

  if (application.documents.signature) {
    write.heading('E-signature');
    write.image(application.documents.signature, 200, 60);
  }

  write.heading('Your rights');
  write.paragraph('Cooling-off: after disbursal you can exit the loan within 3 days by repaying the principal and the proportionate APR, without penalty.');
  write.paragraph('Grievances: grievance@lendswift.example (placeholder contact for this demo). If a complaint is not resolved within 30 days, you can approach the RBI under the Integrated Ombudsman Scheme, 2021 at cms.rbi.org.in.');
  return doc;
}

/** Generates the summary and hands it to the browser as a download. */
export async function downloadApplicationSummary(
  application: ApplicationData,
  receipt: SubmissionReceipt,
): Promise<void> {
  const doc = await createApplicationSummaryPdf(application, receipt);
  doc.save(`lendswift-application-${receipt.reference.slice(0, 8)}.pdf`);
}
