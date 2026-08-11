import { ThemeProvider } from '@mui/material';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PublicationType } from '@/gql/graphql';
import { theme } from '@/src/shared/theme';

const mocks = vi.hoisted(() => ({ sendErrorNotification: vi.fn() }));

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: vi.fn(() => ({ activeFormId: null, edit: vi.fn(), closeForm: vi.fn() })),
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: vi.fn(() => ({
    sendError: vi.fn(),
    sendSuccess: vi.fn(),
    sendErrorNotification: mocks.sendErrorNotification,
  })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
  useIsDesktop: vi.fn(() => true),
}));

import EditPublication from '../EditPublication';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditPublication', () => {
  beforeEach(() => mocks.sendErrorNotification.mockClear());
  afterEach(cleanup);

  it('renders snapshot', () => {
    const { container } = render(
      <Wrapper>
        <EditPublication
          publicationType="PAPERBACK"
          isbn="978-1-234-56789-0"
          width={6}
          widthIn={6}
          height={9}
          heightIn={9}
          depth={0.5}
          depthIn={0.5}
          weight={12}
          weightOz={12}
          fileUrl=""
          loading={false}
          accessibilityStandards={[]}
          accessibilityException={null}
          accessibilityReportUrl=""
          isDimensionFormHidden={false}
          isUploadFileFormDisabled={false}
        />
      </Wrapper>,
    );
    expect(container).toMatchSnapshot('EditPublication');
  });

  it('places an available publication file field between Price and Locations content', () => {
    render(
      <Wrapper>
        <EditPublication
          publicationType={PublicationType.Pdf}
          isbn=""
          width={0}
          widthIn={0}
          height={0}
          heightIn={0}
          depth={0}
          depthIn={0}
          weight={0}
          weightOz={0}
          fileUrl=""
          loading={false}
          accessibilityStandards={[]}
          accessibilityException={null}
          accessibilityReportUrl=""
          isDimensionFormHidden={false}
          isUploadFileFormDisabled={false}
        >
          {(_, fileField) => (
            <>
              <div>Price marker</div>
              {fileField}
              <div>Locations marker</div>
            </>
          )}
        </EditPublication>
      </Wrapper>,
    );

    const price = screen.getByText('Price marker');
    const field = screen.getByTestId('hosted-file-field');
    const locations = screen.getByText('Locations marker');

    expect(price.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(field.compareDocumentPosition(locations) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('advertises both MIME types and extensions to the file picker', () => {
    const { container } = render(
      <Wrapper>
        <EditPublication
          publicationType={PublicationType.Mobi}
          isbn=""
          width={0}
          widthIn={0}
          height={0}
          heightIn={0}
          depth={0}
          depthIn={0}
          weight={0}
          weightOz={0}
          fileUrl=""
          loading={false}
          accessibilityStandards={[]}
          accessibilityException={null}
          accessibilityReportUrl=""
          isDimensionFormHidden={false}
          isUploadFileFormDisabled={false}
        >
          {(_, fileField) => fileField}
        </EditPublication>
      </Wrapper>,
    );

    const accept = (container.querySelector('input[type="file"]') as HTMLInputElement).getAttribute('accept') ?? '';

    expect(accept).toContain('application/x-mobipocket-ebook');
    expect(accept).toContain('.mobi');
  });

  it('silently locks file selection while the surrounding request is busy', () => {
    const onUpdateFile = vi.fn();
    const { container } = render(
      <Wrapper>
        <EditPublication
          publicationType={PublicationType.Pdf}
          isbn=""
          width={0}
          widthIn={0}
          height={0}
          heightIn={0}
          depth={0}
          depthIn={0}
          weight={0}
          weightOz={0}
          fileUrl=""
          loading
          fileUploadBusy
          isDimensionFormHidden={false}
          isUploadFileFormDisabled={false}
          accessibilityStandards={[]}
          accessibilityException={null}
          accessibilityReportUrl=""
          onUpdateFile={onUpdateFile}
        >
          {(_, fileField) => fileField}
        </EditPublication>
      </Wrapper>,
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeDisabled();
    expect(screen.queryByRole('status')).toBeNull();

    fireEvent.change(input, {
      target: { files: [new File([new Uint8Array(7000)], 'late.pdf', { type: 'application/pdf' })] },
    });

    expect(onUpdateFile).not.toHaveBeenCalled();
    expect(mocks.sendErrorNotification).not.toHaveBeenCalled();
  });

  it('hides the publication file field when files are unavailable for the publication type', () => {
    render(
      <Wrapper>
        <EditPublication
          publicationType={PublicationType.Paperback}
          isbn=""
          width={0}
          widthIn={0}
          height={0}
          heightIn={0}
          depth={0}
          depthIn={0}
          weight={0}
          weightOz={0}
          fileUrl=""
          loading={false}
          accessibilityStandards={[]}
          accessibilityException={null}
          accessibilityReportUrl=""
          isDimensionFormHidden={false}
          isUploadFileFormDisabled={false}
        >
          {(_, fileField) => fileField}
        </EditPublication>
      </Wrapper>,
    );

    expect(screen.queryByTestId('hosted-file-field')).toBeNull();
  });
});
