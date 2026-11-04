import { ThemeProvider } from '@mui/material';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  PublisherFix,
  PublisherFixRefusal,
  PublisherFixRejection,
} from '@/src/shared/parsers/XMLParser/onixSourceBridge';
import { makeFinding, type SourceFinding } from '@/src/shared/parsers/XMLParser/validation/findings';
import { theme } from '@/src/shared/theme';

// Interpolation values stay visible in the rendered text, so what each control says can be checked.
vi.mock('@/src/shared/hooks', () => ({
  useTypedTranslation: vi.fn(() => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
  })),
}));

import { inlineFixKey, InlineFixReview } from './InlineFixReview';
import type { OnixInlineFixBook, OnixInlineFixEntry } from './reviewModel';

/**
 * The per-book fix cards of the import review (thoth-app#283 Phase B), at the component level: every value here is a
 * fix-layer eligibility of the shape the bridge returns; the real validator drives the same UI in XMLParse.test.tsx.
 */
const DETAIL = '/ONIXMessage[1]/Product[1]/DescriptiveDetail[1]';
const TEXT_CONTENT = '/ONIXMessage[1]/Product[1]/CollateralDetail[1]/TextContent[1]';

const blocking = (id: string, tier: SourceFinding['tier'], path: string, message: string) =>
  makeFinding({
    id,
    tier,
    stage: tier === 'STRICT' ? 6 : 8,
    scope: 'VALIDITY',
    class: 'NORMATIVE_INVALID',
    blocking: true,
    path,
    message,
  });

const editionEntry = (suggestion: number | null, statement = 'Third, revised edition'): OnixInlineFixEntry => ({
  finding: blocking('R-EDITION-STATEMENT', 'INVENTORY', DETAIL, 'An EditionStatement needs an EditionNumber'),
  fix: { eligible: true, rule: 'R-EDITION-STATEMENT', path: DETAIL, edition: { statements: [statement], suggestion } },
});

const shortEntry = (original: string, overrides: { canOmit?: boolean; storedAsEscapedHtml?: boolean } = {}) =>
  ({
    finding: blocking('_20171221_e_1', 'STRICT', TEXT_CONTENT, 'A short description must not be longer than 350'),
    fix: {
      eligible: true,
      rule: '_20171221_e_1',
      path: TEXT_CONTENT,
      shortDescription: {
        textPath: `${TEXT_CONTENT}/Text[1]`,
        original,
        measure: { length: [...original].length, limit: 350, withinLimit: [...original].length <= 350 },
        canOmit: overrides.canOmit ?? false,
        storedAsEscapedHtml: overrides.storedAsEscapedHtml ?? false,
      },
    },
  }) satisfies OnixInlineFixEntry;

const otherEntry: OnixInlineFixEntry = {
  finding: blocking('_20171126_b_7', 'STRICT', DETAIL, 'LanguageRole 01 and 02 carry the same LanguageCode'),
  fix: null,
};

const book = (entries: readonly OnixInlineFixEntry[], groupKey = 'group-1'): OnixInlineFixBook => ({
  groupKey,
  title: 'A Held-Back Book',
  isbns: ['9781802820010'],
  entries,
});

const renderReview = (
  books: readonly OnixInlineFixBook[],
  overrides: Partial<Parameters<typeof InlineFixReview>[0]> = {},
) => {
  const onFix = vi.fn<(fix: PublisherFix, key: string) => void>();
  const onSkip = vi.fn<(groupKey: string) => void>();
  const view = render(
    <ThemeProvider theme={theme}>
      <InlineFixReview
        books={books}
        resolved={[]}
        skipped={new Set()}
        readyCount={22}
        advisoryCount={9}
        busy={false}
        messages={{}}
        onFix={onFix}
        onSkip={onSkip}
        {...overrides}
      />
    </ThemeProvider>,
  );
  return { ...view, onFix, onSkip };
};

const text = (length: number) => 'abcdefghi '.repeat(Math.ceil(length / 10)).slice(0, length);

describe('InlineFixReview', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('states the summary first, one card per book, with advisories and technical details closed by default', () => {
    renderReview([book([editionEntry(3), shortEntry(text(526))]), book([otherEntry], 'group-2')]);

    expect(screen.getByTestId('inline-fix-summary')).toHaveTextContent('inlineFix.summary {"count":2,"ready":22}');
    const cards = screen.getAllByTestId('inline-fix-card');
    // Two findings on one book: one card, its two controls stacked.
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getAllByTestId('inline-fix-entry')).toHaveLength(2);
    expect(within(cards[0]).getByText('A Held-Back Book')).toBeInTheDocument();
    expect(within(cards[0]).getByText('inlineFix.isbns {"isbns":"9781802820010"}')).toBeInTheDocument();
    expect(within(cards[0]).getByText('inlineFix.problems {"count":2}')).toBeInTheDocument();

    const advisories = screen.getByTestId('inline-fix-advisories');
    expect(advisories).toHaveTextContent('inlineFix.advisories {"count":9}');
    expect(advisories).not.toHaveAttribute('open');
    for (const details of screen.getAllByTestId('onix-review-technical')) {
      expect(details).not.toHaveAttribute('open');
      // Rule IDs, paths and tiers live only in there.
      expect(within(details).getByText(/R-EDITION-STATEMENT|_20171221_e_1|_20171126_b_7/)).not.toBeVisible();
    }
  });

  describe('R-EDITION-STATEMENT', () => {
    it('offers the suggestion through Confirm, and applies nothing until Confirm', async () => {
      const user = userEvent.setup();
      const { onFix } = renderReview([book([editionEntry(3)])]);

      expect(
        screen.getByText('inlineFix.edition.basis {"statement":"Third, revised edition","edition":3}'),
      ).toBeInTheDocument();
      expect(onFix).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: 'inlineFix.edition.confirmSuggestion {"edition":3}' }));
      expect(onFix).toHaveBeenCalledExactlyOnceWith(
        { kind: 'SET_EDITION_NUMBER', rule: 'R-EDITION-STATEMENT', path: DETAIL, edition: 3 },
        inlineFixKey(editionEntry(3)),
      );
    });

    it('offers no suggestion for an ambiguous statement: an empty field, refusing 0, negative and non-integer values', async () => {
      const user = userEvent.setup();
      const { onFix } = renderReview([book([editionEntry(null, 'New edition')])]);

      expect(screen.queryByTestId('onix-review-suggestion')).not.toBeInTheDocument();
      const field = screen.getByRole('textbox', { name: 'inlineFix.edition.label' });
      expect(field).toHaveValue('');
      const confirm = screen.getByRole('button', { name: 'inlineFix.edition.confirm' });

      for (const [value, reason] of [
        ['0', 'EDITION_NOT_POSITIVE'],
        ['-2', 'EDITION_NOT_POSITIVE'],
        ['2.5', 'EDITION_NOT_AN_INTEGER'],
        ['third', 'EDITION_NOT_AN_INTEGER'],
      ]) {
        await user.clear(field);
        await user.type(field, value);
        await user.click(confirm);
        expect(screen.getByText(`inlineFix.reason.${reason}`)).toBeInTheDocument();
      }
      expect(onFix).not.toHaveBeenCalled();

      await user.clear(field);
      await user.type(field, '3');
      await user.click(confirm);
      expect(onFix).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ edition: 3 }), expect.any(String));
    });

    it('lets another number be entered beside the suggestion', async () => {
      const user = userEvent.setup();
      const { onFix } = renderReview([book([editionEntry(3)])]);

      await user.click(screen.getByRole('button', { name: 'inlineFix.edition.chooseAnother' }));
      await user.type(screen.getByRole('textbox', { name: 'inlineFix.edition.label' }), '4');
      await user.click(screen.getByRole('button', { name: 'inlineFix.edition.confirm' }));
      expect(onFix).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ edition: 4 }), expect.any(String));
    });
  });

  describe('_20171221_e_1', () => {
    it('counts every character including markup, disables Confirm above 350 and enables it at 350, never truncating', async () => {
      const user = userEvent.setup();
      const original = `<p>${text(519)}</p>`;
      const { onFix } = renderReview([book([shortEntry(original, { storedAsEscapedHtml: true })])]);

      const editor = screen.getByRole('textbox', { name: 'inlineFix.shortDescription.label' });
      // The editor starts with the whole text as the file states it: nothing is cut.
      expect(editor).toHaveValue(original);
      expect(screen.getByTestId('inline-fix-count')).toHaveTextContent(
        'inlineFix.shortDescription.count {"length":526,"limit":350}',
      );
      const confirm = screen.getByRole('button', { name: 'inlineFix.shortDescription.confirm' });
      expect(confirm).toBeDisabled();
      expect(screen.getByTestId('inline-fix-escaped-html')).toHaveTextContent('inlineFix.shortDescription.escapedHtml');

      // A markup-only edit that stays over the limit is still refused.
      await user.clear(editor);
      await user.click(editor);
      await user.paste(text(519));
      expect(screen.getByTestId('inline-fix-count')).toHaveTextContent('{"length":519,"limit":350}');
      expect(confirm).toBeDisabled();

      await user.clear(editor);
      await user.paste(`<p>${text(344)}</p>`);
      expect(screen.getByTestId('inline-fix-count')).toHaveTextContent('{"length":351,"limit":350}');
      expect(confirm).toBeDisabled();

      await user.clear(editor);
      await user.paste(`<p>${text(343)}</p>`);
      expect(screen.getByTestId('inline-fix-count')).toHaveTextContent('{"length":350,"limit":350}');
      expect(confirm).toBeEnabled();
      await user.click(confirm);
      expect(onFix).toHaveBeenCalledExactlyOnceWith(
        { kind: 'REPLACE_SHORT_DESCRIPTION', rule: '_20171221_e_1', path: TEXT_CONTENT, text: `<p>${text(343)}</p>` },
        expect.any(String),
      );
    });

    it('offers "don\'t import a short description" only where the book keeps another description', async () => {
      const user = userEvent.setup();
      const { onFix, unmount } = renderReview([book([shortEntry(text(400))])]);
      expect(screen.queryByRole('button', { name: 'inlineFix.shortDescription.omit' })).not.toBeInTheDocument();
      expect(screen.queryByTestId('inline-fix-escaped-html')).not.toBeInTheDocument();
      unmount();

      const second = renderReview([book([shortEntry(text(400), { canOmit: true })])]);
      await user.click(screen.getByRole('button', { name: 'inlineFix.shortDescription.omit' }));
      expect(second.onFix).toHaveBeenCalledExactlyOnceWith(
        { kind: 'OMIT_SHORT_DESCRIPTION', rule: '_20171221_e_1', path: TEXT_CONTENT },
        expect.any(String),
      );
      expect(onFix).not.toHaveBeenCalled();
    });
  });

  it('gives a rule outside the allowlist no inline control: only Skip and the line to pass to the feed producer', () => {
    renderReview([book([otherEntry])]);

    const card = screen.getByTestId('inline-fix-card');
    expect(within(card).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(card).queryByTestId('onix-review-suggestion')).not.toBeInTheDocument();
    expect(within(card).getByTestId('inline-fix-source-only')).toHaveTextContent(
      'inlineFix.other.sourceFix {"message":"LanguageRole 01 and 02 carry the same LanguageCode"}',
    );
    expect(
      within(card)
        .getAllByRole('button')
        .map(({ textContent }) => textContent),
    ).toEqual(['inlineFix.skip']);
  });

  it('skips a book for now: it stays held back, and its controls give way to the statement that it is not imported', async () => {
    const user = userEvent.setup();
    const { onSkip, rerender } = renderReview([book([editionEntry(3)])]);

    await user.click(screen.getByRole('button', { name: 'inlineFix.skip' }));
    expect(onSkip).toHaveBeenCalledExactlyOnceWith('group-1');

    rerender(
      <ThemeProvider theme={theme}>
        <InlineFixReview
          books={[book([editionEntry(3)])]}
          resolved={[]}
          skipped={new Set(['group-1'])}
          readyCount={22}
          advisoryCount={0}
          busy={false}
          messages={{}}
          onFix={vi.fn()}
          onSkip={onSkip}
        />
      </ThemeProvider>,
    );
    const card = screen.getByTestId('inline-fix-card');
    expect(card).toHaveAttribute('data-state', 'skipped');
    expect(within(card).getByTestId('inline-fix-skipped')).toHaveTextContent('inlineFix.skipped');
    expect(within(card).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByTestId('inline-fix-summary')).toHaveTextContent('{"count":0,"ready":22}');
  });

  it('says in place why a fix changed nothing, and holds every control while a fix is being checked', () => {
    const entry = editionEntry(3);
    renderReview([book([entry, shortEntry(text(400))])], {
      busy: true,
      messages: { [inlineFixKey(entry)]: { reason: 'NEW_BLOCKING_FINDING' } },
    });

    expect(screen.getByTestId('inline-fix-message')).toHaveTextContent('inlineFix.reason.NEW_BLOCKING_FINDING');
    expect(screen.getByTestId('inline-fix-running')).toHaveTextContent('inlineFix.running');
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'inlineFix.shortDescription.label' })).toBeDisabled();
  });

  it('shows a fixed book resolved in place, with what was corrected', () => {
    renderReview([], {
      resolved: [
        {
          groupKey: 'group-1',
          title: 'A Held-Back Book',
          isbns: ['9781802820010'],
          fixes: [
            {
              recovery: 'PUBLISHER_SUPPLIED_VALUE',
              rule: 'R-EDITION-STATEMENT',
              decision: 'PUBLISHER',
              action: 'SET_EDITION_NUMBER',
              path: DETAIL,
              sourcePath: null,
              valuePath: `${DETAIL}/EditionNumber[1]`,
              original: null,
              value: '3',
              originalTextFormat: null,
              valueTextFormat: null,
            },
          ],
        },
      ],
    });

    const card = screen.getByTestId('inline-fix-card');
    expect(card).toHaveAttribute('data-state', 'resolved');
    expect(within(card).getByTestId('inline-fix-resolved')).toHaveTextContent('inlineFix.resolved');
    expect(card).toHaveTextContent('inlineFix.resolvedValue {"value":"3"}');
    expect(screen.getByTestId('inline-fix-summary')).toHaveTextContent('{"count":0,"ready":22}');
  });
});

describe('inline-fix strings', () => {
  // Exhaustive by type: a refusal or rejection reason added without its message fails to compile here.
  const REASONS = {
    RULE_NOT_ALLOWLISTED: true,
    RULE_MISMATCH: true,
    NO_FINDING: true,
    AMBIGUOUS_FINDING: true,
    NO_NORMALIZED_SOURCE: true,
    TARGET_NOT_FOUND: true,
    TARGET_NOT_APPLICABLE: true,
    AMBIGUOUS_TARGET: true,
    EDITION_NOT_AN_INTEGER: true,
    EDITION_NOT_POSITIVE: true,
    EDITION_TOO_LARGE: true,
    TEXT_OVER_LIMIT: true,
    TEXT_EMPTY: true,
    TEXT_UNCHANGED: true,
    MALFORMED_MARKUP: true,
    TEXT_NOT_IMPORTABLE: true,
    ONLY_DESCRIPTION: true,
    REVALIDATION_UNAVAILABLE: true,
    FINDING_NOT_REPRODUCED: true,
    FINDING_REMAINS: true,
    NEW_BLOCKING_FINDING: true,
  } satisfies Record<PublisherFixRefusal | PublisherFixRejection, true>;

  type Strings = { [key: string]: string | Strings };
  const flatten = (strings: Strings, prefix = ''): Record<string, string> =>
    Object.fromEntries(
      Object.entries(strings).flatMap(([key, value]) =>
        typeof value === 'string' ? [[`${prefix}${key}`, value]] : Object.entries(flatten(value, `${prefix}${key}.`)),
      ),
    );
  const placeholders = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map(([, name]) => name).sort();

  it.each(['en', 'es', 'pt', 'de'])(
    '%s: says every reason, with the same keys and placeholders as English',
    async (locale) => {
      type Messages = { inlineFix: Strings; issueSummary: { recovery: Record<string, string> } };
      const messages = (await import(`@/src/shared/i18n/locales/${locale}/common.json`)) as Messages;
      const english = (await import('@/src/shared/i18n/locales/en/common.json')) as Messages;
      const strings = flatten(messages.inlineFix);
      const reference = flatten(english.inlineFix);

      expect(Object.keys(strings).sort()).toEqual(Object.keys(reference).sort());
      for (const [key, text] of Object.entries(strings)) {
        expect(text, key).toMatch(/\S/);
        expect(placeholders(text), key).toEqual(placeholders(reference[key]));
      }
      for (const reason of Object.keys(REASONS)) expect(strings[`reason.${reason}`], reason).toMatch(/\S/);
      expect(messages.issueSummary.recovery.PUBLISHER_SUPPLIED_VALUE).toMatch(/\S/);
    },
  );
});
