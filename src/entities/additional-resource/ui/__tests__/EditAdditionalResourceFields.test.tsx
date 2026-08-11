/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocks must match hook export names */
import { ThemeProvider } from '@mui/material';
import { render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { theme } from '@/src/shared/theme';

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: vi.fn(() => ({ activeFormId: null, edit: vi.fn(), closeForm: vi.fn() })),
}));

vi.mock('@/src/shared/hooks', () => ({
  useNotifications: vi.fn(() => ({ sendError: vi.fn(), sendSuccess: vi.fn() })),
  useT: vi.fn(() => (key: string) => key),
  useDefaultCurrencyOption: vi.fn(() => ({ value: 'USD', label: 'USD' })),
  useDefaultLocaleOption: vi.fn(() => ({ value: 'en', label: 'English' })),
  useDefaultPlace: vi.fn(() => ''),
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
  useEscapeKey: vi.fn(),
  useIsDesktop: vi.fn(() => true),
  useDebouncedValue: vi.fn((v: unknown) => v),
  useActiveLocale: vi.fn(() => 'en'),
  useCurrentActiveLocale: vi.fn(() => 'en'),
  useQueryToken: vi.fn(() => 'test-token'),
  useProgress: vi.fn(() => ({ progress: null, startProgress: vi.fn(), setProgress: vi.fn(), resetProgress: vi.fn() })),
  usePreventInteraction: vi.fn(),
  usePreventNavigation: vi.fn(),
  useEntityList: vi.fn(() => ({
    items: [],
    activePage: 1,
    totalPages: 1,
    direction: 'ASC',
    orderBy: 'UPDATED_AT',
    searchValue: '',
    debouncedValue: '',
    changePage: vi.fn(),
    changeDirection: vi.fn(),
    changeOrderBy: vi.fn(),
    changeSearchValue: vi.fn(),
    refetch: vi.fn(),
  })),
  useFilterSearchParams: vi.fn(() => ({
    items: [],
    activePage: 1,
    totalPages: 1,
    direction: 'ASC',
    orderBy: 'UPDATED_AT',
    searchValue: '',
    debouncedValue: '',
    changePage: vi.fn(),
    changeDirection: vi.fn(),
    changeOrderBy: vi.fn(),
    changeSearchValue: vi.fn(),
    extraState: {},
    changeExtra: {},
    refetch: vi.fn(),
  })),
  useIsDeutchLocale: vi.fn(() => false),
  useIsDragStarted: vi.fn(() => false),
}));

vi.mock('@/src/shared/hooks/useTypedTranslation', () => ({
  default: vi.fn(() => ({ t: (key: string) => key })),
}));

vi.mock('react-use', () => ({ useCopyToClipboard: () => [null, vi.fn()] }));

import { EditAdditionalResourceAttribution } from '../EditAdditionalResourceAttribution/EditAdditionalResourceAttribution';
import { EditAdditionalResourceDescription } from '../EditAdditionalResourceDescription/EditAdditionalResourceDescription';
import { EditAdditionalResourceDoi } from '../EditAdditionalResourceDoi/EditAdditionalResourceDoi';
import EditAdditionalResourceForm from '../EditAdditionalResourceForm/EditAdditionalResourceForm';
import { EditAdditionalResourceHandle } from '../EditAdditionalResourceHandle/EditAdditionalResourceHandle';
import { EditAdditionalResourceResourceType } from '../EditAdditionalResourceResourceType/EditAdditionalResourceResourceType';
import { EditAdditionalResourceTitle } from '../EditAdditionalResourceTitle/EditAdditionalResourceTitle';
import { EditAdditionalResourceUrl } from '../EditAdditionalResourceUrl/EditAdditionalResourceUrl';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('EditAdditionalResourceFields', () => {
  it('renders EditAdditionalResourceAttribution', () => {
    const { container } = render(
      <Wrapper>
        <EditAdditionalResourceAttribution workId="w1" category="test" />
      </Wrapper>,
    );
    expect(container).toBeDefined();
  });

  it('renders EditAdditionalResourceDescription', () => {
    const { container } = render(
      <Wrapper>
        <EditAdditionalResourceDescription workId="w1" />
      </Wrapper>,
    );
    expect(container).toBeDefined();
  });

  it('renders EditAdditionalResourceDoi', () => {
    const { container } = render(
      <Wrapper>
        <EditAdditionalResourceDoi workId="w1" />
      </Wrapper>,
    );
    expect(container).toBeDefined();
  });

  it('renders EditAdditionalResourceHandle', () => {
    const { container } = render(
      <Wrapper>
        <EditAdditionalResourceHandle workId="w1" />
      </Wrapper>,
    );
    expect(container).toBeDefined();
  });

  it('renders EditAdditionalResourceResourceType', () => {
    const { container } = render(
      <Wrapper>
        <EditAdditionalResourceResourceType workId="w1" />
      </Wrapper>,
    );
    expect(container).toBeDefined();
  });

  it('renders EditAdditionalResourceTitle', () => {
    const { container } = render(
      <Wrapper>
        <EditAdditionalResourceTitle workId="w1" />
      </Wrapper>,
    );
    expect(container).toBeDefined();
  });

  it('renders EditAdditionalResourceUrl', () => {
    const { container } = render(
      <Wrapper>
        <EditAdditionalResourceUrl workId="w1" />
      </Wrapper>,
    );
    expect(container).toBeDefined();
  });

  it('places the file field after Resource Type and before Description', () => {
    const { container } = render(
      <Wrapper>
        <EditAdditionalResourceForm title="Supplement" resourceType="DOCUMENT" />
      </Wrapper>,
    );

    const form = within(container);
    const resourceType = form.getAllByText('additionalResourceResourceType.label')[0];
    const file = form.getByText('additionalResourceFile.label');
    const description = form.getAllByText('additionalResourceDescription.label')[0];

    expect(resourceType.compareDocumentPosition(file) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(file.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(form.getByText('fileUpload.instructions')).toBeInTheDocument();
  });
});
