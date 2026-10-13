import 'fake-indexeddb/auto';
import {
  render, screen, waitFor, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IDBFactory } from 'fake-indexeddb';
import { useState } from 'react';
import {
  beforeEach, describe, expect, it,
} from 'vitest';
import { DOCUMENT_SPECS, type UploadRules } from '../../constants/documents';
import type { UploadedDocument } from '../../types/application';
import { resetVaultConnection } from '../../utils/documentVault';
import { FileUpload, type FileUploadProps } from './FileUpload';

const PDF_HEADER = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37];

function pdf(name: string): File {
  const bytes = new Uint8Array(4096);
  bytes.set(PDF_HEADER);
  return new File([bytes], name, { type: 'application/pdf' });
}

function Harness({ rules = DOCUMENT_SPECS.bankStatements, ...props }: Partial<FileUploadProps> & {
  rules?: UploadRules;
}) {
  const [files, setFiles] = useState<UploadedDocument[]>([]);
  return (
    <FileUpload
      name="bankStatements"
      label="Bank statements"
      hint="Your last 6 months."
      rules={rules}
      files={files}
      onChange={setFiles}
      {...props}
    />
  );
}

const SLOW = { timeout: 4000 };

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetVaultConnection();
});

describe('FileUpload', () => {
  it('labels the group with the document name, hint and limits', () => {
    render(<Harness optional />);
    const group = screen.getByRole('group', { name: /Bank statements/ });
    expect(group).toHaveAccessibleDescription('Your last 6 months. PDF only · up to 10 MB each · max 3 files');
    expect(within(group).getByText('(Optional)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose files' })).toBeInTheDocument();
  });

  it('uploads a chosen file and shows a removable preview', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.upload(screen.getByTestId('upload-input-bankStatements'), pdf('april.pdf'));

    expect(await screen.findByRole('progressbar', { name: /april.pdf/ })).toBeInTheDocument();
    const remove = await screen.findByRole('button', { name: 'Remove april.pdf' }, SLOW);
    expect(screen.getByText('april.pdf uploaded. Checking the document…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add another file' })).toBeInTheDocument();

    await user.click(remove);
    await waitFor(() => expect(screen.queryByText('april.pdf')).not.toBeInTheDocument());
    expect(screen.getByText('april.pdf removed.')).toBeInTheDocument();
  });

  it('supports a custom preview through a render prop', async () => {
    const user = userEvent.setup();
    render(
      <Harness>
        {(file, { remove }) => (
          <button type="button" onClick={remove}>{`Custom ${file.name}`}</button>
        )}
      </Harness>,
    );
    await user.upload(screen.getByTestId('upload-input-bankStatements'), pdf('may.pdf'));
    await user.click(await screen.findByRole('button', { name: 'Custom may.pdf' }, SLOW));
    await waitFor(() => expect(screen.queryByText('Custom may.pdf')).not.toBeInTheDocument());
  });

  it('explains why a file was refused', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<Harness />);
    await user.upload(
      screen.getByTestId('upload-input-bankStatements'),
      new File(['x'], 'photo.png', { type: 'image/png' }),
    );
    expect(await screen.findByText('“photo.png” is not a PDF file. Choose a PDF instead.', { selector: 'li' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Dismiss upload messages' }));
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('hides the drop zone once the file limit is reached', async () => {
    const user = userEvent.setup();
    render(<Harness rules={{ ...DOCUMENT_SPECS.bankStatements, maxFiles: 1 }} />);
    expect(screen.getByRole('button', { name: 'Choose file' })).toBeInTheDocument();
    await user.upload(screen.getByTestId('upload-input-bankStatements'), pdf('one.pdf'));
    await waitFor(() => expect(screen.queryByRole('button', { name: /Choose file|Add another/ })).not.toBeInTheDocument());
  });

  it('marks the choose button invalid so focus can land on it', () => {
    render(<Harness error="Upload your bank statements." />);
    const button = screen.getByRole('button', { name: 'Choose files' });
    expect(button).toHaveAttribute('data-invalid', 'true');
    expect(button).toHaveAccessibleDescription('Upload your bank statements.');
  });
});
