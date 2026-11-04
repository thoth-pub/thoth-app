'use client';

import { useId, useState } from 'react';

import { useTypedTranslation } from '@/src/shared/hooks';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import type { TranslateFunction } from '@/src/shared/parsers';
import {
  checkEditionNumber,
  EDITION_STATEMENT_RULE,
  measureShortDescription,
  type PublisherFix,
  type PublisherSuppliedValueMarker,
  SHORT_DESCRIPTION_LENGTH_RULE,
} from '@/src/shared/parsers/XMLParser/onixSourceBridge';
import { Button, TextField, Typography } from '@/src/shared/ui';

import { type OnixInlineFixBook, type OnixInlineFixEntry, sourceFindingEvidence } from './reviewModel';
import { SuggestedValueConfirmation } from './SuggestedValueConfirmation';
import { TechnicalDetails } from './TechnicalDetails';

/** Why the last fix of one finding changed nothing: a refusal or rejection reason of the fix layer, or a UI check. */
export type InlineFixMessage = { readonly reason: string };

/** A book an accepted fix took out of the held-back list: shown resolved, in place, with what was corrected. */
export type InlineFixResolvedBook = {
  readonly groupKey: string;
  readonly title: string | null;
  readonly isbns: readonly string[];
  readonly fixes: readonly PublisherSuppliedValueMarker[];
};

/** The key one finding's controls and messages are kept under: its rule and its canonical location. */
export const inlineFixKey = (entry: Pick<OnixInlineFixEntry, 'finding'>) =>
  `${entry.finding.id}|${entry.finding.path ?? ''}`;

type InlineFixReviewProps = {
  /** The held-back books, one card each, in file order. */
  readonly books: readonly OnixInlineFixBook[];
  /** Books an accepted fix resolved since the file was checked. */
  readonly resolved: readonly InlineFixResolvedBook[];
  /** Work groups the publisher skipped for now: held back, with zero mutations. */
  readonly skipped: ReadonlySet<string>;
  /** Books the plan imports. */
  readonly readyCount: number;
  /** Advice that blocks nothing, collapsed to one line. */
  readonly advisoryCount: number;
  /** True while one fix is being re-validated: every control waits, so only one fix is ever in flight. */
  readonly busy: boolean;
  /** The last refusal or rejection of each finding's fix, by `inlineFixKey`. */
  readonly messages: Readonly<Record<string, InlineFixMessage>>;
  readonly onFix: (fix: PublisherFix, key: string) => void;
  readonly onSkip: (groupKey: string) => void;
};

/**
 * The publisher-facing review of books a partial import holds back (thoth-app#283 contract item 4): a summary line
 * first, then one card per book - never per finding - with one sentence on what is wrong, one control per finding the
 * v1 allowlist can fix, and "Skip this book for now". Advice that blocks nothing collapses to one closed line, and every
 * path, rule ID and tier waits behind each finding's technical details.
 */
export const InlineFixReview = ({
  books,
  resolved,
  skipped,
  readyCount,
  advisoryCount,
  busy,
  messages,
  onFix,
  onSkip,
}: InlineFixReviewProps) => {
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.common });
  const translate = t as TranslateFunction;
  const headingId = useId();

  if (books.length === 0 && resolved.length === 0 && advisoryCount === 0) return null;

  const attention = books.filter(({ groupKey }) => !skipped.has(groupKey)).length;

  return (
    <section aria-labelledby={headingId} data-testid="inline-fix-review" className="flex flex-col gap-3">
      <Typography id={headingId} component="h2" fontWeight="bold">
        {translate('inlineFix.heading')}
      </Typography>
      <Typography data-testid="inline-fix-summary">
        {translate('inlineFix.summary', { count: attention, ready: readyCount })}
      </Typography>
      {busy && (
        <Typography role="status" variant="body2" data-testid="inline-fix-running">
          {translate('inlineFix.running')}
        </Typography>
      )}
      <ul className="flex flex-col gap-3">
        {resolved.map((book) => (
          <ResolvedCard key={book.groupKey} book={book} translate={translate} />
        ))}
        {books.map((book) => (
          <InlineFixCard
            key={book.groupKey}
            book={book}
            skipped={skipped.has(book.groupKey)}
            busy={busy}
            messages={messages}
            onFix={onFix}
            onSkip={onSkip}
            translate={translate}
          />
        ))}
      </ul>
      {advisoryCount > 0 && (
        <details data-testid="inline-fix-advisories">
          <summary className="cursor-pointer">
            <Typography component="span" variant="body2">
              {translate('inlineFix.advisories', { count: advisoryCount })}
            </Typography>
          </summary>
        </details>
      )}
    </section>
  );
};

const BookHeading = ({
  title,
  isbns,
  translate,
}: {
  readonly title: string | null;
  readonly isbns: readonly string[];
  readonly translate: TranslateFunction;
}) => (
  <>
    <Typography component="h3" fontWeight="bold">
      {title ?? translate('inlineFix.untitled')}
    </Typography>
    <Typography variant="body2">
      {isbns.length > 0 ? translate('inlineFix.isbns', { isbns: isbns.join(', ') }) : translate('inlineFix.noIsbn')}
    </Typography>
  </>
);

const ResolvedCard = ({
  book,
  translate,
}: {
  readonly book: InlineFixResolvedBook;
  readonly translate: TranslateFunction;
}) => (
  <li data-testid="inline-fix-card" data-state="resolved" className="flex flex-col gap-1 rounded border p-3">
    <BookHeading title={book.title} isbns={book.isbns} translate={translate} />
    <Typography role="status" variant="body2" fontWeight="bold" data-testid="inline-fix-resolved">
      {translate('inlineFix.resolved')}
    </Typography>
    {book.fixes.map((fix) => (
      <Typography key={`${fix.rule}|${fix.path}`} variant="body2">
        {fix.value === null
          ? translate('inlineFix.resolvedOmitted')
          : translate('inlineFix.resolvedValue', { value: fix.value })}
      </Typography>
    ))}
  </li>
);

type InlineFixCardProps = {
  readonly book: OnixInlineFixBook;
  readonly skipped: boolean;
  readonly busy: boolean;
  readonly messages: Readonly<Record<string, InlineFixMessage>>;
  readonly onFix: (fix: PublisherFix, key: string) => void;
  readonly onSkip: (groupKey: string) => void;
  readonly translate: TranslateFunction;
};

/** One held-back book: what is wrong, one control per fixable finding (stacked), and Skip. */
export const InlineFixCard = ({ book, skipped, busy, messages, onFix, onSkip, translate }: InlineFixCardProps) => (
  <li
    data-testid="inline-fix-card"
    data-state={skipped ? 'skipped' : 'open'}
    className="flex flex-col gap-3 rounded border p-3"
  >
    <BookHeading title={book.title} isbns={book.isbns} translate={translate} />
    <Typography variant="body2">{translate('inlineFix.problems', { count: book.entries.length })}</Typography>
    {skipped ? (
      <Typography role="status" variant="body2" fontWeight="bold" data-testid="inline-fix-skipped">
        {translate('inlineFix.skipped')}
      </Typography>
    ) : (
      <>
        {book.entries.map((entry) => {
          const key = inlineFixKey(entry);
          return (
            <div key={key} data-testid="inline-fix-entry" className="flex flex-col gap-2">
              <FindingControl entry={entry} busy={busy} onFix={(fix) => onFix(fix, key)} translate={translate} />
              {messages[key] && (
                <Typography role="alert" variant="body2" color="error" data-testid="inline-fix-message">
                  {translate(`inlineFix.reason.${messages[key].reason}`)}
                </Typography>
              )}
              <TechnicalDetails evidence={sourceFindingEvidence(entry.finding)} translate={translate} />
            </div>
          );
        })}
        <div>
          <Button variant="outlined" size="small" disabled={busy} onClick={() => onSkip(book.groupKey)}>
            {translate('inlineFix.skip')}
          </Button>
        </div>
      </>
    )}
  </li>
);

type FindingControlProps = {
  readonly entry: OnixInlineFixEntry;
  readonly busy: boolean;
  readonly onFix: (fix: PublisherFix) => void;
  readonly translate: TranslateFunction;
};

/** The one control a finding gets: an edition number, a short-description editor, or none (the source-fix line). */
const FindingControl = ({ entry, busy, onFix, translate }: FindingControlProps) => {
  const { fix } = entry;
  if (fix?.rule === EDITION_STATEMENT_RULE) {
    return <EditionControl entry={entry} fix={fix} busy={busy} onFix={onFix} translate={translate} />;
  }
  if (fix?.rule === SHORT_DESCRIPTION_LENGTH_RULE) {
    return <ShortDescriptionControl entry={entry} fix={fix} busy={busy} onFix={onFix} translate={translate} />;
  }
  return (
    <div data-testid="inline-fix-source-only" className="flex flex-col gap-1">
      <Typography variant="body2">{translate('inlineFix.other.sentence')}</Typography>
      <Typography variant="body2">
        {translate('inlineFix.other.sourceFix', { message: entry.finding.message || entry.finding.id })}
      </Typography>
    </div>
  );
};

type EditionFix = Extract<NonNullable<OnixInlineFixEntry['fix']>, { readonly rule: typeof EDITION_STATEMENT_RULE }>;
type ShortFix = Extract<
  NonNullable<OnixInlineFixEntry['fix']>,
  { readonly rule: typeof SHORT_DESCRIPTION_LENGTH_RULE }
>;

const EditionControl = ({
  entry,
  fix,
  busy,
  onFix,
  translate,
}: {
  readonly entry: OnixInlineFixEntry;
  readonly fix: EditionFix;
  readonly busy: boolean;
  readonly onFix: (fix: PublisherFix) => void;
  readonly translate: TranslateFunction;
}) => {
  const headingId = useId();
  const [draft, setDraft] = useState('');
  const [invalid, setInvalid] = useState<string | null>(null);
  const { statements, suggestion } = fix.edition;
  const statement = statements[0] ?? '';
  const submit = (edition: number | string) =>
    onFix({ kind: 'SET_EDITION_NUMBER', rule: EDITION_STATEMENT_RULE, path: entry.finding.path ?? '', edition });
  const confirmDraft = () => {
    const checked = checkEditionNumber(draft);
    if (!checked.ok) {
      setInvalid(checked.reason);
      return;
    }
    setInvalid(null);
    submit(checked.value);
  };

  const field = (
    <div className="flex flex-wrap items-start gap-2">
      <TextField
        label={translate('inlineFix.edition.label')}
        value={draft}
        error={invalid !== null}
        helperText={invalid === null ? undefined : translate(`inlineFix.reason.${invalid}`)}
        onChange={(event) => setDraft(event.target.value)}
        slotProps={{ htmlInput: { inputMode: 'numeric', 'aria-describedby': headingId } }}
        size="small"
        className="max-w-xs"
        disabled={busy}
      />
      <Button variant="contained" size="small" disabled={busy} onClick={confirmDraft}>
        {translate('inlineFix.edition.confirm')}
      </Button>
    </div>
  );

  return (
    <div data-testid="inline-fix-edition" className="flex flex-col gap-2">
      <Typography id={headingId} variant="body2">
        {translate('inlineFix.edition.sentence', { statement })}
      </Typography>
      {suggestion === null ? (
        field
      ) : (
        <SuggestedValueConfirmation
          describedBy={headingId}
          disabled={busy}
          basis={translate('inlineFix.edition.basis', { statement, edition: suggestion })}
          confirmLabel={translate('inlineFix.edition.confirmSuggestion', { edition: suggestion })}
          chooseAnotherLabel={translate('inlineFix.edition.chooseAnother')}
          onConfirm={() => submit(suggestion)}
        >
          {field}
        </SuggestedValueConfirmation>
      )}
    </div>
  );
};

const ShortDescriptionControl = ({
  entry,
  fix,
  busy,
  onFix,
  translate,
}: {
  readonly entry: OnixInlineFixEntry;
  readonly fix: ShortFix;
  readonly busy: boolean;
  readonly onFix: (fix: PublisherFix) => void;
  readonly translate: TranslateFunction;
}) => {
  const headingId = useId();
  const { original, measure, canOmit, storedAsEscapedHtml } = fix.shortDescription;
  // The editor starts from the text as the file states it; nothing is ever cut automatically.
  const [draft, setDraft] = useState(original);
  const live = measureShortDescription(draft);
  const path = entry.finding.path ?? '';

  return (
    <div data-testid="inline-fix-short-description" className="flex flex-col gap-2">
      <Typography id={headingId} variant="body2">
        {translate('inlineFix.shortDescription.sentence', { length: measure.length, limit: measure.limit })}
      </Typography>
      {storedAsEscapedHtml && (
        <Typography variant="body2" data-testid="inline-fix-escaped-html">
          {translate('inlineFix.shortDescription.escapedHtml')}
        </Typography>
      )}
      <TextField
        label={translate('inlineFix.shortDescription.label')}
        value={draft}
        multiline
        minRows={3}
        onChange={(event) => setDraft(event.target.value)}
        slotProps={{ htmlInput: { 'aria-describedby': headingId } }}
        disabled={busy}
      />
      <Typography
        variant="body2"
        data-testid="inline-fix-count"
        color={live.withinLimit ? 'textPrimary' : 'error'}
        aria-live="polite"
      >
        {translate('inlineFix.shortDescription.count', { length: live.length, limit: live.limit })}
      </Typography>
      {!live.withinLimit && (
        <Typography variant="body2">
          {translate('inlineFix.shortDescription.overLimit', { limit: live.limit })}
        </Typography>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="contained"
          size="small"
          disabled={busy || !live.withinLimit}
          onClick={() =>
            onFix({ kind: 'REPLACE_SHORT_DESCRIPTION', rule: SHORT_DESCRIPTION_LENGTH_RULE, path, text: draft })
          }
        >
          {translate('inlineFix.shortDescription.confirm')}
        </Button>
        {canOmit && (
          <Button
            variant="outlined"
            size="small"
            disabled={busy}
            onClick={() => onFix({ kind: 'OMIT_SHORT_DESCRIPTION', rule: SHORT_DESCRIPTION_LENGTH_RULE, path })}
          >
            {translate('inlineFix.shortDescription.omit')}
          </Button>
        )}
      </div>
    </div>
  );
};
