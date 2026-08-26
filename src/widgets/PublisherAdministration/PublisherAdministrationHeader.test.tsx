import { ThemeProvider } from '@mui/material';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DistributionJobStatus, DistributionPlatform, ThothPackage } from '@/gql/graphql';
import { theme } from '@/src/shared/theme';

// Render translation keys verbatim so label/handler assertions are deterministic.
vi.mock('@/src/shared/hooks/useTypedTranslation', () => ({
  default: () => ({ t: (key: string) => key }),
}));
// The publisher creation affordance is the existing `AddNewPublisher`
// component, rendered for real here through the speed dial. Only its existing
// `useAddNewPublisher` seam is stubbed - the same seam the component already
// owned - so this file proves the header reuses that component and delegates to
// that hook, without reaching for a query client, the publisher state machine or
// any duplicated creation logic.
const openModalMock = vi.fn();
const useAddNewPublisherMock = vi.fn(() => ({
  isOpen: false,
  control: {},
  submitDisabled: false,
  openModal: openModalMock,
  closeModal: vi.fn(),
  createNewPublisher: vi.fn(),
  handleSubmit: vi.fn(() => vi.fn()),
}));
vi.mock('@/src/entities/publisher/ui/AddNewPublisher/useAddNewPublisher', () => ({
  useAddNewPublisher: () => useAddNewPublisherMock(),
}));

import PublisherAdministrationHeader from './PublisherAdministrationHeader';

type HeaderProps = ComponentProps<typeof PublisherAdministrationHeader>;

const DISPLAY_LABELS: Partial<Record<DistributionPlatform, string>> = {
  [DistributionPlatform.Oapen]: 'OAPEN Library',
  [DistributionPlatform.Doab]: 'Directory of Open Access Books',
};

const createProps = (overrides?: Partial<HeaderProps>): HeaderProps => ({
  selectedPublisherIds: [],
  changeSelectedPublisherIds: vi.fn(),
  selectedPackages: [],
  changeSelectedPackages: vi.fn(),
  selectedPlatforms: [],
  changeSelectedPlatforms: vi.fn(),
  selectedJobStatuses: [],
  changeSelectedJobStatuses: vi.fn(),
  jobPresence: 'all',
  changeJobPresence: vi.fn(),
  publisherFilterOptions: [
    { id: 'pub-1', name: 'Publisher One' },
    { id: 'pub-2', name: 'Publisher Two' },
  ],
  packageFilterOptions: [ThothPackage.Oasis, ThothPackage.Sphinx],
  platformFilterOptions: [DistributionPlatform.Oapen, DistributionPlatform.Doab],
  jobStatusFilterOptions: [DistributionJobStatus.Pending, DistributionJobStatus.Failed],
  getPlatformDisplayLabel: (platform: DistributionPlatform) => DISPLAY_LABELS[platform] ?? platform,
  ...overrides,
});

const renderHeader = (overrides?: Partial<HeaderProps>): HeaderProps => {
  const props = createProps(overrides);
  render(
    <ThemeProvider theme={theme}>
      <PublisherAdministrationHeader {...props} />
    </ThemeProvider>,
  );
  return props;
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('PublisherAdministrationHeader (APP-02C local multi-select correction)', () => {
  it('renders every filter control', () => {
    renderHeader();

    expect(screen.getByRole('combobox', { name: 'filterPublisher' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'filterPackages' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'filterEnabledPlatforms' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'filterJobStatuses' })).toBeInTheDocument();
    expect(screen.getByLabelText('filterJobPresence')).toBeInTheDocument();
  });

  it('keeps multiple selected values readable as chips within the field', () => {
    renderHeader({ selectedPublisherIds: ['pub-1', 'pub-2'] });

    // Both selected publishers are shown; nothing is dropped or hidden.
    expect(screen.getByText('Publisher One')).toBeInTheDocument();
    expect(screen.getByText('Publisher Two')).toBeInTheDocument();
  });

  it('still maps a multi-select choice to the exact backend value (semantics unchanged)', async () => {
    const { changeSelectedPackages } = renderHeader();

    await userEvent.click(screen.getByRole('combobox', { name: 'filterPackages' }));
    await userEvent.click(await screen.findByRole('option', { name: ThothPackage.Sphinx }));

    expect(changeSelectedPackages).toHaveBeenCalledWith([ThothPackage.Sphinx]);
  });

  it('still maps an enabled-platform choice through its display label to its exact enum value', async () => {
    const { changeSelectedPlatforms } = renderHeader();

    await userEvent.click(screen.getByRole('combobox', { name: 'filterEnabledPlatforms' }));
    await userEvent.click(await screen.findByRole('option', { name: 'OAPEN Library' }));

    // The label is display-only; the value passed through is the exact enum.
    expect(changeSelectedPlatforms).toHaveBeenCalledWith([DistributionPlatform.Oapen]);
  });

  it('still maps the job-presence control to its exact tri-state value', async () => {
    const { changeJobPresence } = renderHeader();

    await userEvent.selectOptions(screen.getByLabelText('filterJobPresence'), 'withoutJob');

    expect(changeJobPresence).toHaveBeenCalledWith('withoutJob');
  });
});

// APP-SHELL-SU-02: the title row keeps only the page title. The publisher
// creation affordance is now the fixed speed dial, mounted from this header so
// it stays behind the existing authoritative-superuser gate.
describe('PublisherAdministrationHeader publisher creation affordance (APP-SHELL-SU-02)', () => {
  it('keeps the Publishers page title', () => {
    renderHeader();

    expect(screen.getByRole('heading', { name: 'title' })).toBeInTheDocument();
  });

  it('renders no inline Add Publisher button in the title row', () => {
    renderHeader();

    const title = screen.getByRole('heading', { name: 'title' });

    expect(screen.queryByRole('button', { name: /actions\.addPublisher/ })).not.toBeInTheDocument();
    expect(title.parentElement?.querySelector('button')).toBeNull();
  });

  it('mounts the publisher speed dial with its single Add Publisher action', () => {
    renderHeader();

    expect(screen.getByRole('button', { name: 'Publishers SpeedDial' })).toBeInTheDocument();

    const actions = screen.getAllByRole('menuitem');

    expect(actions).toHaveLength(1);
    expect(actions[0]).toHaveAccessibleName('actions.addPublisher');
  });

  it('reuses the existing AddNewPublisher component and its creation hook', () => {
    renderHeader();

    // The hook the existing component already owned is the only creation seam
    // consulted; the header adds none of its own.
    expect(useAddNewPublisherMock).toHaveBeenCalled();
    expect(screen.getByTestId('PersonAddIcon')).toBeInTheDocument();
  });

  it('delegates activation to the existing hook rather than re-implementing it', async () => {
    renderHeader();

    await userEvent.hover(screen.getByRole('button', { name: 'Publishers SpeedDial' }));
    await userEvent.click(screen.getByRole('menuitem'));

    expect(openModalMock).toHaveBeenCalledTimes(1);
  });

  it('leaves every filter control untouched by the affordance change', () => {
    renderHeader();

    expect(screen.getByRole('combobox', { name: 'filterPublisher' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'filterPackages' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'filterEnabledPlatforms' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'filterJobStatuses' })).toBeInTheDocument();
    expect(screen.getByLabelText('filterJobPresence')).toBeInTheDocument();
  });
});

// APP-PUBLISHER-FILTER-ALIGN-01. jsdom cannot measure pixels, and its cascade is
// source-order only rather than specificity-aware, so any computed geometry read
// here would not describe a browser. What it can hold honestly is the *style
// contract* these filters emit: the local `sx` rules Emotion scopes to the
// Autocomplete root element. These tests pin that contract - the tag row is
// content-sized with the shared field height only as a floor, and the inner text
// input no longer carries the shared TextField's whole control height. Actual
// vertical alignment remains a browser-verification gate.
type LocalStyleRule = {
  selector: string;
  media: string;
  style: CSSStyleDeclaration;
};

// Matches a selector whose last compound is the tag row itself
// (`.MuiAutocomplete-inputRoot`, optionally with further classes on the same
// element), and never one that descends into a child of it.
const TAG_ROW_SELECTOR = /\.MuiAutocomplete-inputRoot[\w.-]*$/;
// Matches a selector whose last compound is the inner text input. The negative
// lookahead keeps `.MuiAutocomplete-inputRoot` from matching as a prefix.
const TAG_ROW_INPUT_SELECTOR = /\.MuiAutocomplete-input(?![\w-])[\w.-]*$/;
const DESKTOP_MEDIA = 'min-width';

const emotionClassesOf = (element: HTMLElement): string[] =>
  Array.from(element.classList).filter((className) => className.startsWith('css-'));

const autocompleteRootFor = (filterLabel: string): HTMLElement => {
  const root = screen.getByRole('combobox', { name: filterLabel }).closest('.MuiAutocomplete-root');

  if (!(root instanceof HTMLElement)) {
    throw new Error(`No Autocomplete root rendered for "${filterLabel}"`);
  }

  return root;
};

// Every CSS rule in the document that is scoped to this element's own Emotion
// class - that is, the local `sx` contract plus MUI's own root styles, and
// nothing from the shared theme.
const localStyleRulesFor = (element: HTMLElement): LocalStyleRule[] => {
  const scopedClasses = emotionClassesOf(element);
  const collected: LocalStyleRule[] = [];

  const visit = (rules: CSSRuleList, media: string) => {
    Array.from(rules).forEach((rule) => {
      if ('cssRules' in rule && 'media' in rule) {
        const mediaRule = rule as CSSMediaRule;
        visit(mediaRule.cssRules, mediaRule.media.mediaText);
        return;
      }

      const { selectorText, style } = rule as CSSStyleRule;

      if (typeof selectorText === 'string' && scopedClasses.some((name) => selectorText.includes(name))) {
        collected.push({ selector: selectorText, media, style });
      }
    });
  };

  Array.from(document.styleSheets).forEach((sheet) => visit(sheet.cssRules, ''));

  return collected;
};

const declaredValue = (
  rules: LocalStyleRule[],
  selector: RegExp,
  property: string,
  mediaFragment = '',
): string => {
  const matching = rules.filter(
    (rule) => (mediaFragment ? rule.media.includes(mediaFragment) : rule.media === '') && selector.test(rule.selector),
  );

  // Same scope and same specificity, so the last declaration is the effective one.
  return matching.map((rule) => rule.style.getPropertyValue(property)).filter(Boolean).at(-1) ?? '';
};

const MULTIPLE_FILTER_LABELS = ['filterPublisher', 'filterPackages', 'filterEnabledPlatforms', 'filterJobStatuses'];

const renderWithSelections = () =>
  renderHeader({
    selectedPublisherIds: ['pub-1', 'pub-2'],
    selectedPackages: [ThothPackage.Oasis],
  });

describe('PublisherAdministrationHeader multi-select geometry (APP-PUBLISHER-FILTER-ALIGN-01)', () => {
  it('applies one shared local treatment to every multiple filter', () => {
    renderWithSelections();

    const treatments = MULTIPLE_FILTER_LABELS.map((label) => emotionClassesOf(autocompleteRootFor(label)).join(' '));

    expect(treatments.every((treatment) => treatment !== '')).toBe(true);
    expect(new Set(treatments).size).toBe(1);
  });

  it.each(MULTIPLE_FILTER_LABELS)(
    'stops %s inheriting the shared TextField control height on its inner text input',
    (label) => {
      renderWithSelections();

      const rules = localStyleRulesFor(autocompleteRootFor(label));

      // The inner input is a flex sibling of the chips. Left at the shared
      // TextField height (2rem, 2.75rem at desktop) it out-sizes the tag row and
      // pushes the chips off-centre and out of the outline.
      expect(declaredValue(rules, TAG_ROW_INPUT_SELECTOR, 'height')).toBe('auto');
    },
  );

  it.each(MULTIPLE_FILTER_LABELS)('lets %s grow only when its chips genuinely wrap', (label) => {
    renderWithSelections();

    const rules = localStyleRulesFor(autocompleteRootFor(label));

    // Content-sized, so a wrapped selection grows the field...
    expect(declaredValue(rules, TAG_ROW_SELECTOR, 'height')).toBe('auto');
    // ...but never below the shared small-field height at either breakpoint, so
    // an empty or single-row control still looks like every other small field.
    expect(declaredValue(rules, TAG_ROW_SELECTOR, 'min-height')).toBe('2rem');
    expect(declaredValue(rules, TAG_ROW_SELECTOR, 'min-height', DESKTOP_MEDIA)).toBe('2.75rem');
  });

  it.each(MULTIPLE_FILTER_LABELS)('keeps the existing centred, wrapping, evenly spaced chip row on %s', (label) => {
    renderWithSelections();

    const rules = localStyleRulesFor(autocompleteRootFor(label));

    expect(declaredValue(rules, TAG_ROW_SELECTOR, 'align-items')).toBe('center');
    expect(declaredValue(rules, TAG_ROW_SELECTOR, 'flex-wrap')).toBe('wrap');
    expect(declaredValue(rules, TAG_ROW_SELECTOR, 'gap')).toBe('4px');
    expect(declaredValue(rules, /\.MuiChip-root$/, 'margin')).toBe('0px');
  });

  it('leaves the native back-catalogue job select outside that local treatment', () => {
    renderWithSelections();

    const jobPresence = screen.getByLabelText('filterJobPresence');
    const multiSelectClasses = emotionClassesOf(autocompleteRootFor('filterPublisher'));

    expect(jobPresence.closest('.MuiAutocomplete-root')).toBeNull();
    expect(
      multiSelectClasses.some((name) => jobPresence.closest('.MuiFormControl-root')?.classList.contains(name)),
    ).toBe(false);
  });
});
