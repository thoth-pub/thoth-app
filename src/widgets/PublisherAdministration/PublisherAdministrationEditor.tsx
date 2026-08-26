'use client';

import { FormControlLabel } from '@mui/material';

import { type DistributionPlatform, ThothPackage } from '@/gql/graphql';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import {
  Button,
  Checkbox,
  CloseButton,
  Modal,
  ModalWrapper,
  TextField,
  TranslatedContent,
  Typography,
} from '@/src/shared/ui';

import type {
  PublisherAdministrationEditSession,
  PublisherAdministrationPlatformRow,
} from './usePublisherAdministrationEditor';

const SUBSCRIPTION_PACKAGE_FIELD_ID = 'staff_publisher_subscription_package';

type PublisherAdministrationEditorProps = {
  session: PublisherAdministrationEditSession;
  platformRows: PublisherAdministrationPlatformRow[];
  isSaving: boolean;
  canCancel: boolean;
  changePackage: (subscriptionPackage: ThothPackage) => void;
  togglePlatform: (platform: DistributionPlatform, selected: boolean) => void;
  save: () => void;
  cancelEdit: () => void;
};

// APP-02B: the focused staff editor for exactly one publisher's desired service
// configuration.
//
// It is purely presentational: identity, the version token and every selection
// live in the edit session owned by usePublisherAdministrationEditor, so this
// component cannot retarget an edit, and it never reads global
// active-publisher state. The publisher it edits is named from the session's
// own snapshot, so it stays correct even once the underlying report row has
// been refetched or has dropped out of the current filtered page.
//
// While a save is in flight the surface is deliberately non-dismissible - no
// close control, no backdrop dismissal, no escape key - because dismissing it
// could let a second publisher's edit begin before this attempt settles.
const PublisherAdministrationEditor = ({
  session,
  platformRows,
  isSaving,
  canCancel,
  changePackage,
  togglePlatform,
  save,
  cancelEdit,
}: PublisherAdministrationEditorProps) => {
  const { snapshot, draft } = session;

  return (
    <Modal
      open
      aria-labelledby="staff_publisher_editor_title"
      disableEscapeKeyDown={!canCancel}
      onClose={canCancel ? cancelEdit : undefined}
    >
      <ModalWrapper onClickAway={canCancel ? cancelEdit : undefined}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col">
            <Typography id="staff_publisher_editor_title" variant="h6">
              <TranslatedContent content="editorTitle" namespace={NAMESPACES.enum.publishers} />
            </Typography>
            {/* The publisher being edited, named from the session snapshot. */}
            <Typography>{snapshot.publisherName}</Typography>
            <Typography variant="caption">{snapshot.publisherId}</Typography>
          </div>
          {/* Withheld entirely while an attempt is in flight. */}
          {canCancel && <CloseButton onClose={cancelEdit} />}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={SUBSCRIPTION_PACKAGE_FIELD_ID}>
            <TranslatedContent content="editorSubscriptionPackage" namespace={NAMESPACES.enum.publishers} />
          </label>
          <TextField
            select
            id={SUBSCRIPTION_PACKAGE_FIELD_ID}
            value={draft.subscriptionPackage}
            disabled={isSaving}
            onChange={(event) => changePackage(event.target.value as ThothPackage)}
            slotProps={{ select: { native: true } }}
          >
            {/* Package choices come from the generated contract enum. There is no
                local package-to-capability or package-to-platform lookup, and
                changing the package never rewrites the platform selection
                below. */}
            {Object.values(ThothPackage).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </TextField>
        </div>

        <div className="flex flex-col gap-2">
          <Typography>
            <TranslatedContent content="editorDistributionPlatforms" namespace={NAMESPACES.enum.publishers} />
          </Typography>
          <Typography variant="body2">
            <TranslatedContent content="editorLinkedGroupNotice" namespace={NAMESPACES.enum.publishers} />
          </Typography>
          {platformRows.map((row) => {
            const isSelected = draft.enabledPlatforms.includes(row.platform);
            // Backend assignability, used exactly as given: a platform the
            // backend does not currently allow can only be interacted with while
            // it is still selected, so it may be removed but never (re-)added.
            const isSelectable = row.assignable || isSelected;

            return (
              <div key={row.platform} className="flex flex-col">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isSelected}
                      disabled={isSaving || !isSelectable}
                      onChange={(event) => togglePlatform(row.platform, event.target.checked)}
                    />
                  }
                  label={row.displayLabel}
                />
                <div className="flex flex-wrap gap-2 pl-8">
                  {!row.assignable && (
                    <Typography variant="caption">
                      <TranslatedContent
                        content="editorPlatformNotAssignable"
                        namespace={NAMESPACES.enum.publishers}
                      />
                    </Typography>
                  )}
                  {/* Linked-group membership is displayed as backend metadata
                      only; no closure over the group is computed here. */}
                  {row.linkedGroup && (
                    <Typography variant="caption">
                      <TranslatedContent content="editorLinkedGroupLabel" namespace={NAMESPACES.enum.publishers} />
                      {`: ${row.linkedGroup}`}
                    </Typography>
                  )}
                  {row.backCatalogueBehaviour && (
                    <Typography variant="caption">
                      <TranslatedContent
                        content="editorBackCatalogueBehaviour"
                        namespace={NAMESPACES.enum.publishers}
                      />
                      {`: ${row.backCatalogueBehaviour}`}
                    </Typography>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={save} disabled={isSaving}>
            <TranslatedContent content="editorSave" namespace={NAMESPACES.enum.publishers} />
          </Button>
          <Button onClick={cancelEdit} disabled={!canCancel}>
            <TranslatedContent content="editorCancel" namespace={NAMESPACES.enum.publishers} />
          </Button>
          {/* In-flight only: it states that the attempt is running, never that
              anything has been saved. */}
          {isSaving && (
            <Typography role="status" variant="body2">
              <TranslatedContent content="editorSaving" namespace={NAMESPACES.enum.publishers} />
            </Typography>
          )}
        </div>
      </ModalWrapper>
    </Modal>
  );
};

export default PublisherAdministrationEditor;
