import { FileDown, LockKeyhole, ShieldQuestion } from 'lucide-react';

const NOTES = [
  {
    icon: <LockKeyhole aria-hidden="true" className="size-5" />,
    title: 'Encrypted on your device',
    body: 'Your answers and files are saved in this browser with AES-256 encryption. They expire after 72 hours and are deleted when you start afresh or submit.',
  },
  {
    icon: <FileDown aria-hidden="true" className="size-5" />,
    title: 'Light on mobile data',
    body: 'Photos of documents are shrunk to under 2 MB on your phone before upload, and uploads can be retried if the signal drops.',
  },
  {
    icon: <ShieldQuestion aria-hidden="true" className="size-5" />,
    title: 'Checks here are simulated',
    body: 'This is a demonstration. PAN, Aadhaar and one-time-password checks run in your browser — nothing is sent to NSDL, UIDAI or a credit bureau, and no credit decision is made.',
  },
];

/** How applicant data is handled, stated plainly — including what is simulated. */
export function TrustNotes() {
  return (
    <section id="privacy" aria-labelledby="trust-title" className="scroll-mt-28 rounded-panel border border-line bg-surface p-6 sm:p-10">
      <h2 id="trust-title" className="max-w-xl text-[24px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[28px]">
        What happens to your information
      </h2>
      <ul className="mt-8 grid gap-8 md:grid-cols-3">
        {NOTES.map((note) => (
          <li key={note.title} className="flex flex-col gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-canvas-sunken text-brand">{note.icon}</span>
            <h3 className="text-[15px] font-semibold text-ink">{note.title}</h3>
            <p className="text-sm leading-6 text-slate">{note.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
