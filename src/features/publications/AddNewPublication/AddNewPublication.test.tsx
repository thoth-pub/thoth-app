/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mock must match the real hook export */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PublicationType } from '@/gql/graphql';

import AddNewPublication from './AddNewPublication';

const mocks = vi.hoisted(() => ({
  file: new File([new Uint8Array(7000)], 'pending.pdf', { type: 'application/pdf' }),
  publication: {
    type: 'PDF',
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
    prices: [],
    locations: [],
  },
}));

vi.mock('./useAddNewPublication', () => ({
  useAddNewPublication: () => ({
    publication: mocks.publication,
    file: mocks.file,
    loading: false,
    uploadProgress: 0,
    defaultCurrencyOption: undefined,
    finishEditing: vi.fn(),
    create: vi.fn(),
    updateIsbn: vi.fn(),
    updateType: vi.fn(),
    updateDimensions: vi.fn(),
    updatePrices: vi.fn(),
    updateLocations: vi.fn(),
    deleteLocation: vi.fn(),
    updateAccessibility: vi.fn(),
    deleteAccessibility: vi.fn(),
    updateFile: vi.fn(),
  }),
}));

vi.mock('@/src/entities/price', () => ({ EditPrice: () => <div>Price field</div> }));
vi.mock('@/src/entities/locations', () => ({ EditLocations: () => <div>Locations field</div> }));
vi.mock('@/src/entities/publication', () => ({
  EditPublication: ({
    children,
    pendingFileName,
  }: {
    children: (isFullTextUrlHidden: boolean, fileField: React.ReactNode) => React.ReactNode;
    pendingFileName?: string;
  }) => (
    <div>
      <span data-testid="pending-file-name">{pendingFileName}</span>
      {children(false, <div>Publication file field</div>)}
    </div>
  ),
}));

vi.mock('@/src/shared/ui', () => ({
  TableNewEntityFormWrapper: ({ children }: { children: React.ReactNode }) => children,
}));

describe('AddNewPublication', () => {
  afterEach(cleanup);

  it('passes the selected filename as pending and places the file field between Price and Locations', () => {
    mocks.publication.type = PublicationType.Pdf;
    render(<AddNewPublication workId="work-1" isDimensionFormHidden={false} isUploadFileFormDisabled={false} />);

    expect(screen.getByTestId('pending-file-name').textContent).toBe('pending.pdf');

    const price = screen.getByText('Price field');
    const file = screen.getByText('Publication file field');
    const locations = screen.getByText('Locations field');

    expect(price.compareDocumentPosition(file) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(file.compareDocumentPosition(locations) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
