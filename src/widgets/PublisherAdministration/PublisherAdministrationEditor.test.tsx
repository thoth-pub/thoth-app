import { ThemeProvider } from '@mui/material';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BackCatalogueBehaviour,
  DistributionPlatform,
  DistributionPlatformGroup,
  ThothPackage,
} from '@/gql/graphql';
import { theme } from '@/src/shared/theme';

// Render translation keys verbatim so copy/state assertions are deterministic.
vi.mock('@/src/shared/hooks/useTypedTranslation', () => ({
  default: () => ({ t: (key: string) => key }),
}));
// Spy proving global active-publisher isolation: the staff editor must never
// consult the active-publisher state machine.
const stateMachineSpy = vi.fn();
vi.mock('@/src/entities/publisher/store/hooks/usePublisherStateMachine', () => ({
  default: () => stateMachineSpy(),
}));

import PublisherAdministrationEditor from './PublisherAdministrationEditor';
import type {
  PublisherAdministrationEditSession,
  PublisherAdministrationPlatformRow,
} from './usePublisherAdministrationEditor';

const session: PublisherAdministrationEditSession = {
  snapshot: {
    publisherId: 'pub-A',
    publisherName: 'Publisher A',
    expectedUpdatedAt: '2026-08-01T10:00:00Z',
    subscriptionPackage: ThothPackage.Sphinx,
    enabledPlatforms: [DistributionPlatform.Oapen, DistributionPlatform.GooglePlay],
  },
  draft: {
    subscriptionPackage: ThothPackage.Sphinx,
    enabledPlatforms: [DistributionPlatform.Oapen, DistributionPlatform.GooglePlay],
  },
};

// Backend-provided metadata exactly as the API describes it: DOAB is currently
// not assignable, both listed platforms share a linked group, and GOOGLE_PLAY -
// which this publisher currently has enabled - has no metadata at all.
const platformRows: PublisherAdministrationPlatformRow[] = [
  {
    platform: DistributionPlatform.Oapen,
    displayLabel: 'OAPEN Library',
    assignable: true,
    linkedGroup: DistributionPlatformGroup.OapenDoab,
    backCatalogueBehaviour: BackCatalogueBehaviour.PullFeed,
  },
  {
    platform: DistributionPlatform.Doab,
    displayLabel: 'Directory of Open Access Books',
    assignable: false,
    linkedGroup: DistributionPlatformGroup.OapenDoab,
    backCatalogueBehaviour: BackCatalogueBehaviour.PullFeed,
  },
  { platform: DistributionPlatform.GooglePlay, displayLabel: DistributionPlatform.GooglePlay, assignable: false },
];

const handlers = {
  changePackage: vi.fn(),
  togglePlatform: vi.fn(),
  save: vi.fn(),
  cancelEdit: vi.fn(),
};

const renderEditor = (overrides?: {
  session?: PublisherAdministrationEditSession;
  platformRows?: PublisherAdministrationPlatformRow[];
  isSaving?: boolean;
  canCancel?: boolean;
}) =>
  render(
    <ThemeProvider theme={theme}>
      <PublisherAdministrationEditor
        session={overrides?.session ?? session}
        platformRows={overrides?.platformRows ?? platformRows}
        isSaving={overrides?.isSaving ?? false}
        canCancel={overrides?.canCancel ?? true}
        changePackage={handlers.changePackage}
        togglePlatform={handlers.togglePlatform}
        save={handlers.save}
        cancelEdit={handlers.cancelEdit}
      />
    </ThemeProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('PublisherAdministrationEditor', () => {
  it('identifies the publisher being edited from the session snapshot', () => {
    renderEditor();

    expect(screen.getByText('Publisher A')).toBeInTheDocument();
    expect(screen.getByText('pub-A')).toBeInTheDocument();
  });

  it('never consults the global active-publisher state machine', () => {
    renderEditor();

    expect(stateMachineSpy).not.toHaveBeenCalled();
  });

  it('reports a package change without touching the platform selection', async () => {
    const user = userEvent.setup();

    renderEditor();

    await user.selectOptions(screen.getByLabelText('editorSubscriptionPackage'), ThothPackage.Pyramid);

    expect(handlers.changePackage).toHaveBeenCalledWith(ThothPackage.Pyramid);
    expect(handlers.togglePlatform).not.toHaveBeenCalled();
  });

  it('reports exactly the toggled platform, with no linked-group closure', async () => {
    const user = userEvent.setup();

    renderEditor();

    await user.click(screen.getByRole('checkbox', { name: 'OAPEN Library' }));

    // OAPEN and DOAB share a linked group; only the toggled platform is
    // reported and no other selection is touched.
    expect(handlers.togglePlatform).toHaveBeenCalledTimes(1);
    expect(handlers.togglePlatform).toHaveBeenCalledWith(DistributionPlatform.Oapen, false);
  });

  it('shows backend platform metadata as presentation only', () => {
    renderEditor();

    expect(screen.getByRole('checkbox', { name: 'Directory of Open Access Books' })).toBeInTheDocument();
    expect(screen.getAllByText('editorPlatformNotAssignable').length).toBe(2);
    expect(screen.getAllByText(/editorLinkedGroupLabel/).length).toBe(2);
    expect(screen.getAllByText(/editorBackCatalogueBehaviour/).length).toBe(2);
  });

  it('keeps a non-assignable, unselected platform unselectable', () => {
    renderEditor();

    // DOAB is not assignable and this publisher does not have it enabled, so it
    // cannot be added; assignability is backend metadata, never inferred here.
    expect(screen.getByRole('checkbox', { name: 'Directory of Open Access Books' })).toBeDisabled();
  });

  it('keeps a currently enabled platform with no metadata visible, checked and removable', () => {
    renderEditor();

    const unknown = screen.getByRole('checkbox', { name: DistributionPlatform.GooglePlay });

    expect(unknown).toBeChecked();
    // Removable while still selected, because the row is the publisher's own
    // current state; missing metadata never makes it re-addable.
    expect(unknown).toBeEnabled();
  });

  it('makes a removed unknown-metadata platform unselectable again', () => {
    renderEditor({
      session: {
        ...session,
        draft: { ...session.draft, enabledPlatforms: [DistributionPlatform.Oapen] },
      },
    });

    expect(screen.getByRole('checkbox', { name: DistributionPlatform.GooglePlay })).toBeDisabled();
  });

  it('submits through the session save handler', async () => {
    const user = userEvent.setup();

    renderEditor();

    await user.click(screen.getByRole('button', { name: 'editorSave' }));

    expect(handlers.save).toHaveBeenCalledTimes(1);
  });

  it('is dismissible only while no attempt is in flight', async () => {
    const user = userEvent.setup();

    renderEditor();

    expect(screen.getByRole('button', { name: 'editorCancel' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(handlers.cancelEdit).toHaveBeenCalledTimes(1);
  });

  it('becomes non-dismissible while a save is in flight, and claims nothing about the result', () => {
    renderEditor({ isSaving: true, canCancel: false });

    // No close control, no enabled cancel and no enabled save: nothing here can
    // dismiss this attempt or start a second one before it settles.
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'editorCancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'editorSave' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('editorSaving');
    expect(screen.queryByText('editorOutcomeSaved')).not.toBeInTheDocument();
  });

  it('freezes every control while a save is in flight', () => {
    renderEditor({ isSaving: true, canCancel: false });

    expect(screen.getByLabelText('editorSubscriptionPackage')).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'OAPEN Library' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: DistributionPlatform.GooglePlay })).toBeDisabled();
  });

  it('offers no bulk or multi-publisher affordance', () => {
    renderEditor();

    // The only publisher the editor knows about is the session's own.
    expect(screen.queryByText('Publisher B')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      '',
      'editorSave',
      'editorCancel',
    ]);
  });
});
