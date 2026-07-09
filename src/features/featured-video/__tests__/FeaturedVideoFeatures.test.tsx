import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/src/shared/theme';
import { describe, expect, it, vi } from 'vitest';
import AddFeaturedVideo from '../AddFeaturedVideo/AddFeaturedVideo';
import EditFeaturedVideo from '../EditFeaturedVideo/EditFeaturedVideo';

vi.mock('@/src/entities/featured-video', () => ({
  useFeaturedVideoStateMachine: vi.fn(() => ({
    activeEntity: { id: 'fv1', title: 'Test Video', url: '', width: 1920, height: 1080, fileUrl: '', orderNumber: 1 },
    update: vi.fn(),
    finishEditing: vi.fn(),
  })),
  useCreateFeaturedVideo: vi.fn(() => ({ createFeaturedVideo: vi.fn(), loading: false, progress: 0 })),
  useUpdateFeaturedVideo: vi.fn(() => ({ updateFeaturedVideo: vi.fn() })),
  useUploadFeaturedVideoFile: vi.fn(() => ({ uploadFeaturedVideoFile: vi.fn() })),
  EditFeaturedVideoForm: vi.fn(({ title, ...props }) => <div {...props}>EditFeaturedVideoForm:{title}</div>),
}));

vi.mock('@/src/shared/hooks', () => ({
  useActiveLocale: vi.fn(() => 'en'),
  useDebouncedValue: vi.fn((v) => v),
  useEscapeKey: vi.fn(),
  useIsDesktop: vi.fn(() => false),
  useIsDeutchLocale: vi.fn(() => false),
  useIsDragStarted: vi.fn(() => false),
  usePreventInteraction: vi.fn(),
  usePreventNavigation: vi.fn(),
  useQueryToken: vi.fn(() => 'token'),
  useTypedTranslation: vi.fn(() => ({ t: (s: string) => s })),
  useNotifications: vi.fn(() => ({ notify: vi.fn() })),
  useDefaultCurrencyOption: vi.fn(() => null),
  useDefaultLocaleOption: vi.fn(() => null),
  useDefaultPlace: vi.fn(() => null),
}));

vi.mock('@/src/shared/store/forms/hooks/useFormStateMachine', () => ({
  default: vi.fn(() => ({
    state: 'edit',
    startEditing: vi.fn(),
    cancelEditing: vi.fn(),
    confirmEditing: vi.fn(),
  })),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('FeaturedVideoFeature', () => {
  it('renders AddFeaturedVideo', () => {
    const { container } = render(<Wrapper><AddFeaturedVideo workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });

  it('renders EditFeaturedVideo', () => {
    const { container } = render(<Wrapper><EditFeaturedVideo workId="w1" /></Wrapper>);
    expect(container).toBeDefined();
  });
});
