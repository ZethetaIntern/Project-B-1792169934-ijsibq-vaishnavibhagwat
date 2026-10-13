// Generates public/lendswift-terms-and-conditions.pdf, the sample terms linked from
// the consent on the review step. Run with: node scripts/generate-terms-pdf.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { jsPDF as PdfDocument } from 'jspdf';

const OUTPUT = fileURLToPath(new URL('../public/lendswift-terms-and-conditions.pdf', import.meta.url));
const MARGIN = 56;
const WIDTH = 595.28 - MARGIN * 2;
const BOTTOM = 841.89 - MARGIN;

const SECTIONS = [
  ['About this document', 'These are sample terms for LendSwift, a fictional lender used in a front-end demonstration project. They are not a real offer, contract or legal advice, and no loan can be taken out through this application.'],
  ['1. Your application', 'Submitting the application form asks LendSwift to consider you for a loan. It is not an approval. LendSwift may ask for more information or documents and may decline an application.'],
  ['2. Key Fact Statement', 'Before you sign a loan agreement you will receive a Key Fact Statement showing the loan amount, tenure, interest rate, annual percentage rate (APR), fees, number and amount of instalments and the total amount payable. No fee or charge that is not in the Key Fact Statement will be charged.'],
  ['3. Interest, fees and instalments', 'Interest is charged on the reducing balance at the rate in your Key Fact Statement. A processing fee of 1% of the loan amount (minimum Rs 2,000, maximum Rs 25,000) is deducted from the amount disbursed. Instalments (EMIs) are due monthly.'],
  ['4. Cooling-off period', 'You may exit the loan within 3 days of disbursal by repaying the principal and the proportionate APR, without any penalty.'],
  ['5. Credit information', 'With your consent, LendSwift will obtain your credit report from credit information companies to assess your application, and will report repayment information to them as required by law.'],
  ['6. Your data', 'LendSwift collects only the information needed to assess and service your loan, uses it for that purpose, and keeps it only as long as required. In this demo, your answers and files are stored encrypted in your own browser and are deleted when you submit or start a fresh application.'],
  ['7. Communication', 'With your consent, LendSwift will contact you by SMS, email and phone about your application and loan. You can opt out of marketing messages at any time.'],
  ['8. Grievances', 'Contact the Grievance Redressal Officer at grievance@lendswift.example (a placeholder address for this demo). If your complaint is not resolved within 30 days, or you are not satisfied with the response, you may complain to the Reserve Bank of India under the Reserve Bank - Integrated Ombudsman Scheme, 2021 at https://cms.rbi.org.in.'],
];

const doc = new PdfDocument({ unit: 'pt', format: 'a4' });
doc.setProperties({ title: 'LendSwift sample terms and conditions', creator: 'LendSwift demo' });
let y = MARGIN;

doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(11, 27, 51);
doc.text('LendSwift - Terms and Conditions (sample)', MARGIN, y + 6);
y += 30;
doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(138, 79, 0);
doc.text('Demonstration document for a fictional lender. Not a real contract.', MARGIN, y);
y += 26;

SECTIONS.forEach(([heading, body]) => {
  const lines = doc.setFont('helvetica', 'normal').setFontSize(10).splitTextToSize(body, WIDTH);
  if (y + 24 + lines.length * 14 > BOTTOM) {
    doc.addPage();
    y = MARGIN;
  }
  doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(11, 27, 51).text(heading, MARGIN, y);
  y += 16;
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(36, 49, 75).text(lines, MARGIN, y);
  y += lines.length * 14 + 14;
});

writeFileSync(OUTPUT, Buffer.from(doc.output('arraybuffer')));
process.stdout.write(`Wrote ${OUTPUT}\n`);
