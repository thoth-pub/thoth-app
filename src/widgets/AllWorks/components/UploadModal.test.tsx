import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockUploadStep, mockPreviewStep, mockPush } = vi.hoisted(() => ({
  mockUploadStep: vi.fn(),
  mockPreviewStep: vi.fn(),
  mockPush: vi.fn(),
}));

// eslint-disable-next-line @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocking a hook
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

vi.mock('./UploadStep', () => ({
  UploadStep: (props: { onPreview?: (plan: unknown, warnings: unknown) => void }) => {
    mockUploadStep(props);

    return <div data-testid="upload-step" />;
  },
}));

vi.mock('./PreviewStep', () => ({
  PreviewStep: (props: { onSubmit: () => void; onRunningChange?: (running: boolean) => void }) => {
    mockPreviewStep(props);

    return (
      <>
        {/* Stands in for pressing Create: the real PreviewStep signals the run synchronously here. */}
        <button type="button" onClick={() => props.onRunningChange?.(true)}>
          create
        </button>
        <button type="button" onClick={props.onSubmit}>
          confirm
        </button>
      </>
    );
  },
}));

vi.mock('./TemplateStep', () => ({ TemplateStep: () => <div /> }));

// A stand-in that honours `isDismissible` the way the real FullScreenModal does: the close control
// is disabled and the dismiss path is refused while locked. It lets this integration test observe
// whether UploadModal has made the modal non-dismissible, without pulling in MUI's backdrop.
vi.mock('@/src/features/layout/FullScreenModal/FullScreenModal', () => ({
  default: ({
    children,
    onClose,
    isDismissible = true,
  }: {
    children: React.ReactNode;
    onClose: () => void;
    isDismissible?: boolean;
  }) => (
    <div>
      <button type="button" onClick={() => isDismissible && onClose()} disabled={!isDismissible}>
        close
      </button>
      {children}
    </div>
  ),
}));

vi.mock('@/src/shared/ui', () => ({
  ContentSection: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  Step: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  StepLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Stepper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TranslatedContent: ({ content }: { content: string }) => <span>{content}</span>,
}));

import type { ImportIssue, ImportPlan } from '@/src/shared/types';
import { getDefaultWork } from '@/src/shared/utils/work';

import { UploadModal } from './UploadModal';

/**
 * The modal is where the parsed plan is held between the upload and the preview. It should hold
 * it whole, keep diagnostics beside it rather than in it, and let go of both when it closes.
 */
describe('UploadModal', () => {
  // The project does not enable vitest globals, so RTL's auto-cleanup does not run.
  afterEach(cleanup);

  const work = getDefaultWork({ id: 'work-1' });
  const chapter = { ...getDefaultWork({ id: 'chapter-1' }), relationId: 'work-1' };

  const plan: ImportPlan = {
    works: [work],
    chapters: [chapter],
    series: [
      {
        name: 'Arc Companions',
        target: { kind: 'existing', seriesId: 'series-1' },
        members: [{ workId: 'work-1', orderNumber: 2 }],
      },
    ],
  };

  const warnings: ImportIssue[] = [
    {
      severity: 'warning',
      code: 'onix.series.non_publisher_collection_skipped',
      message: 'a series was skipped',
      source: { kind: 'onix', productIndex: 2 },
    },
  ];

  const source = { type: 'onix' as const, filename: 'catalogue.xml' };

  const lastPreviewProps = () => mockPreviewStep.mock.calls.at(-1)?.[0];

  /** What the upload step does once contributor resolution has produced the final plan. */
  const sendPlan = async (nextPlan: ImportPlan, nextWarnings: ImportIssue[] = []) => {
    const { onPreview } = mockUploadStep.mock.calls.at(-1)?.[0] ?? {};

    await act(async () => onPreview?.(nextPlan, nextWarnings, source));
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hands the preview the plan it was given, with warnings beside it', async () => {
    render(<UploadModal isOpen onClose={vi.fn()} />);

    await sendPlan(plan, warnings);

    expect(lastPreviewProps().plan).toEqual(plan);
    expect(lastPreviewProps().warnings).toEqual(warnings);
    // The source travels to the preview beside the plan, so the running/failure report can name it.
    expect(lastPreviewProps().source).toEqual(source);
  });

  it('starts with an empty plan and no warnings', () => {
    render(<UploadModal isOpen onClose={vi.fn()} />);

    expect(lastPreviewProps().plan).toEqual({ works: [], chapters: [], series: [] });
    expect(lastPreviewProps().warnings).toEqual([]);
  });

  it('clears the plan and the warnings together when the upload is closed', async () => {
    render(<UploadModal isOpen onClose={vi.fn()} />);

    await sendPlan(plan, warnings);
    await userEvent.click(screen.getByRole('button', { name: 'close' }));

    expect(lastPreviewProps().plan).toEqual({ works: [], chapters: [], series: [] });
    expect(lastPreviewProps().warnings).toEqual([]);
  });

  it('gives each reset its own empty plan rather than a shared one', async () => {
    render(<UploadModal isOpen onClose={vi.fn()} />);

    await sendPlan(plan, warnings);
    await userEvent.click(screen.getByRole('button', { name: 'close' }));

    const firstEmpty = lastPreviewProps().plan;

    await sendPlan(plan, warnings);
    await userEvent.click(screen.getByRole('button', { name: 'close' }));

    // Two resets, two plans: nothing one import appends to can reach the next.
    expect(lastPreviewProps().plan).not.toBe(firstEmpty);
  });

  it('becomes non-dismissible the moment Create is pressed, and dismissible again when the run ends', async () => {
    const onClose = vi.fn();
    render(<UploadModal isOpen onClose={onClose} />);

    await sendPlan(plan, warnings);

    const closeButton = () => screen.getByRole('button', { name: 'close' });

    // Before the run: the modal can be dismissed as usual.
    expect(closeButton()).not.toBeDisabled();

    // Create fires the preview's running signal synchronously; the modal locks in the same tick,
    // with no intervening dismissible frame.
    await userEvent.click(screen.getByRole('button', { name: 'create' }));
    expect(closeButton()).toBeDisabled();

    // The lock is real: while it holds, the close path does not reach onClose.
    await userEvent.click(closeButton());
    expect(onClose).not.toHaveBeenCalled();

    // When the preview reports the run finished, the modal is dismissible again.
    act(() => lastPreviewProps().onRunningChange?.(false));
    expect(closeButton()).not.toBeDisabled();
  });
});
