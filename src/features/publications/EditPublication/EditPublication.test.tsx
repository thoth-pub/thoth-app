/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mock factories must match the real hook export names */
import { ThemeProvider } from '@mui/material';
import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PublicationType } from '@/gql/graphql';
import { theme } from '@/src/shared/theme';

import EditPublication from './EditPublication';

const mocks = vi.hoisted(() => ({
  loading: false,
  fileUploadLoading: false,
  uploadProgress: null as number | null,
  updateFile: vi.fn(),
  sendErrorNotification: vi.fn(),
}));

// The real entity form, HostedFileField and FileDropzone are rendered so the wiring is
// exercised through the actual browse/drop behaviour rather than through prop assertions.
vi.mock('./useEditPublication', () => ({
  useEditPublication: () => ({
    activePublication: {
      id: 'pub-1',
      type: PublicationType.Pdf,
      isbn: '',
      width: 0,
      widthIn: 0,
      height: 0,
      heightIn: 0,
      depth: 0,
      depthIn: 0,
      weight: 0,
      weightOz: 0,
      accessibilityStandard: null,
      accessibilityAdditionalStandard: null,
      accessibilityException: null,
      accessibilityReportUrl: '',
      fileUrl: '',
      prices: [],
      locations: [],
    },
    priceFormVersion: 0,
    loading: mocks.loading,
    fileUploadLoading: mocks.fileUploadLoading,
    uploadProgress: mocks.uploadProgress,
    defaultCurrencyOption: undefined,
    deleteLocationLoading: false,
    finishEditing: vi.fn(),
    updateSizes: vi.fn(),
    updateIsbn: vi.fn(),
    updateType: vi.fn(),
    updatePrices: vi.fn(),
    updateLocations: vi.fn(),
    deleteLocation: vi.fn(),
    updateAccessibility: vi.fn(),
    deleteAccessibility: vi.fn(),
    updateFile: mocks.updateFile,
  }),
}));

vi.mock('@/src/entities/price', () => ({ EditPrice: () => <div>Price field</div> }));
vi.mock('@/src/entities/locations', () => ({ EditLocations: () => <div>Locations field</div> }));
vi.mock('@/src/entities/user', () => ({ useUser: () => ({ user: { isSuperuser: false } }) }));

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: vi.fn(() => ({ activeFormId: null, edit: vi.fn(), closeForm: vi.fn() })),
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: () => ({
    sendError: vi.fn(),
    sendSuccess: vi.fn(),
    sendErrorNotification: mocks.sendErrorNotification,
  }),
  useT: () => (key: string) => key,
  useTypedTranslation: () => ({ t: (key: string) => key }),
  useDefaultCurrencyOption: () => undefined,
  useEscapeKey: vi.fn(),
  useIsDesktop: () => true,
}));

vi.mock('@/src/shared/hooks/useTypedTranslation', () => ({
  default: () => ({
    t: (key: string, options?: Record<string, string | number>) =>
      options?.progress === undefined ? key : `${key}:${options.progress}`,
  }),
}));

const validFile = new File([new Uint8Array(7000)], 'publication.pdf', { type: 'application/pdf' });

const renderEditPublication = () =>
  render(
    <ThemeProvider theme={theme}>
      <EditPublication workId="work-1" isDimensionFormHidden={false} isUploadFileFormDisabled={false} />
    </ThemeProvider>,
  );

const getFileInput = () => screen.getByTestId('hosted-file-field').querySelector('input[type="file"]')!;
const getDropzone = () => screen.getByTestId('hosted-file-field').querySelector('[data-drag-active]')!;

const dropFile = (file: File) => {
  const dropzone = getDropzone();
  const dropEvent = createEvent.drop(dropzone);
  Object.defineProperty(dropEvent, 'dataTransfer', { value: { files: [file] } });
  fireEvent(dropzone, dropEvent);

  return dropEvent;
};

describe('EditPublication file upload locking', () => {
  beforeEach(() => {
    mocks.loading = false;
    mocks.fileUploadLoading = false;
    mocks.uploadProgress = null;
    mocks.updateFile.mockReset();
    mocks.sendErrorNotification.mockReset();
  });

  afterEach(cleanup);

  it('locks browse while another publication mutation is in flight', () => {
    mocks.loading = true;
    renderEditPublication();

    const input = getFileInput();

    expect(input).toBeDisabled();
    expect(screen.getByRole('button', { name: /fileUpload.browse/i })).toBeDisabled();

    fireEvent.change(input, { target: { files: [validFile] } });

    expect(mocks.updateFile).not.toHaveBeenCalled();
  });

  it('locks drop while another publication mutation is in flight', () => {
    mocks.loading = true;
    renderEditPublication();

    const dropEvent = dropFile(validFile);

    // The dropzone still swallows the drop so the browser does not navigate to the file.
    expect(dropEvent.defaultPrevented).toBe(true);
    expect(mocks.updateFile).not.toHaveBeenCalled();
  });

  it('does not present an upload while only another publication mutation is pending', () => {
    mocks.loading = true;
    renderEditPublication();

    expect(getFileInput()).toBeDisabled();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByText('fileUpload.uploading')).toBeNull();
    expect(screen.getByText('fileUpload.instructions')).toBeDefined();
  });

  it('keeps the upload presentation while the file itself is uploading', () => {
    mocks.loading = true;
    mocks.fileUploadLoading = true;
    mocks.uploadProgress = 42;
    renderEditPublication();

    expect(getFileInput()).toBeDisabled();
    expect(screen.getByRole('button', { name: /fileUpload.browse/i })).toBeDisabled();
    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText('fileUpload.uploadingProgress:42')).toBeDefined();

    fireEvent.change(getFileInput(), { target: { files: [validFile] } });
    dropFile(validFile);

    expect(mocks.updateFile).not.toHaveBeenCalled();
  });

  it('allows browse and drop while the publication form is idle', () => {
    renderEditPublication();

    expect(getFileInput()).not.toBeDisabled();

    fireEvent.change(getFileInput(), { target: { files: [validFile] } });
    expect(mocks.updateFile).toHaveBeenCalledWith(validFile);

    dropFile(validFile);
    expect(mocks.updateFile).toHaveBeenCalledTimes(2);
  });

  it('keeps the prerequisite notification for a disabled idle form', () => {
    render(
      <ThemeProvider theme={theme}>
        <EditPublication workId="work-1" isDimensionFormHidden={false} isUploadFileFormDisabled />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /fileUpload.browse/i }));

    expect(mocks.sendErrorNotification).toHaveBeenCalledWith('publicationUploadFileDisabled');
    expect(mocks.updateFile).not.toHaveBeenCalled();
  });

  it('stays silently busy instead of warning about prerequisites while a mutation is pending', () => {
    mocks.loading = true;
    render(
      <ThemeProvider theme={theme}>
        <EditPublication workId="work-1" isDimensionFormHidden={false} isUploadFileFormDisabled />
      </ThemeProvider>,
    );

    fireEvent.change(getFileInput(), { target: { files: [validFile] } });
    dropFile(validFile);

    expect(mocks.sendErrorNotification).not.toHaveBeenCalled();
    expect(mocks.updateFile).not.toHaveBeenCalled();
  });
});
