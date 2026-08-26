'use client';

import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';

import AddNewPublisher from '@/src/entities/publisher/ui/AddNewPublisher/AddNewPublisher';
import { SpeedDial, SpeedDialActions, TranslatedContent } from '@/src/shared/ui';

// APP-SHELL-SU-02: the /admin/publishers creation affordance.
//
// Add Publisher used to be an inline button in this page's title row. It is now
// the same fixed bottom-right speed dial already established on /admin/works,
// built from the shared SpeedDial primitives and following that surface's
// static-tooltip action-label convention. `WorksSpeedDial` is work-specific and
// is neither reused nor generalised; this component is deliberately narrow, and
// exists only for this surface's single publisher action.
//
// It owns no creation logic whatsoever. The existing `AddNewPublisher` component
// still renders the modal and the form and still runs `useAddNewPublisher`, so
// creating a publisher continues to create its initial imprint, refetch the
// user, rebuild linked publisher state, activate the new publisher and navigate
// to /admin/publisher. All this adds is a different control wired to the very
// same `openModal` callback.
const PublisherAdministrationSpeedDial = () => (
  <AddNewPublisher
    renderTrigger={(openModal) => (
      <SpeedDial
        ariaLabel="Publishers SpeedDial"
        sx={{
          position: 'fixed',
          bottom: 60,
          right: 40,
          '& .MuiSpeedDial-fab': { color: 'secondary.main' },
        }}
        direction="up"
        icon={<SpeedDialIcon />}
      >
        {/* The handler sits on the action itself rather than on its icon, so the
            whole action target - including keyboard activation - opens the
            existing modal. */}
        <SpeedDialActions
          onClick={openModal}
          icon={<PersonAddIcon color="primary" />}
          slotProps={{
            tooltip: {
              open: true,
              title: (
                <span className="capitalize">
                  <TranslatedContent content="actions.addPublisher" />
                </span>
              ),
            },
          }}
        />
      </SpeedDial>
    )}
  />
);

export default PublisherAdministrationSpeedDial;
