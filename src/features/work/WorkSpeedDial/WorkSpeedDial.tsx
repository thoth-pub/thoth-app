'use client';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import { useRouter } from 'next/navigation';

import { useWorkRecommendations } from '@/src/entities/work';
import useDeleteWork from '@/src/entities/work/api/hooks/useDeleteWork';
import type { WorkId } from '@/src/entities/work/model/work.types';
import type { QueryToken } from '@/src/shared';
import { ANCHORS, ROUTES } from '@/src/shared/constants';
import { SpeedDial, SpeedDialActions, Typography } from '@/src/shared/ui';
import DataIndicator from '@/src/shared/ui/core/DataIndicator/DataIndicator';

type WorkSpeedDialProps = {
  workId: WorkId;
  queryToken: QueryToken;
};

const buttonItemStyle = {
  minWidth: '10px',
  minHeight: '10px',
  height: '10px',
  width: '10px',
  boxShadow: 'none !important',
};

const { BASIC_DETAILS, DESCRIPTIONS, CONTRIBUTIONS, FUNDINGS } = ANCHORS;

const WorkSpeedDial = (props: WorkSpeedDialProps) => {
  const { workId, queryToken } = props;

  const {
    isAllInformationFilled,
    isEmpty,
    isBasicDetailsSectionEmpty,
    isBasicDetailsSectionFilled,
    isDescriptionsSectionEmpty,
    isDescriptionsSectionFilled,
    isContributionsEmpty,
    isContributionsRequired,
    isFundingsEmpty,
    isFundingsRequired,
  } = useWorkRecommendations({ workId });
  const { deleteWork } = useDeleteWork({ queryToken });
  const router = useRouter();

  const handleDelete = () => {
    deleteWork(workId);
    router.push(ROUTES.DASHBOARD);
  };

  const actions = [
    {
      icon: <DeleteOutlineIcon color="primary" onClick={handleDelete} />,
      name: 'Delete',
    },
    {
      icon: (
        <DataIndicator
          isEmpty={isEmpty}
          isValid={isAllInformationFilled}
          sx={{ boxShadow: 'none !important' }}
          component="span"
        />
      ),
      name: 'Recommendations',
    },
  ];

  return (
    <SpeedDial
      ariaLabel="Work SpeedDial"
      sx={{
        position: 'fixed',
        bottom: 60,
        right: 40,
        '& .MuiSpeedDial-fab': { color: 'secondary.main' },
      }}
      direction="up"
      icon={<SpeedDialIcon />}
    >
      {actions.map((action) => (
        <SpeedDialActions
          key={action.name}
          icon={action.icon}
          slotProps={{
            tooltip:
              action.name === 'Recommendations'
                ? {
                    title: (
                      <ul className="flex flex-col gap-2 p-0 text-black">
                        <Typography variant="body2" component="li">
                          <a href={`#${BASIC_DETAILS}`}>
                            <DataIndicator
                              isEmpty={isBasicDetailsSectionEmpty}
                              isValid={isBasicDetailsSectionFilled}
                              sx={{ ...buttonItemStyle }}
                            />
                            Basic details
                          </a>
                        </Typography>
                        <Typography variant="body2" component="li">
                          <a href={`#${CONTRIBUTIONS}`}>
                            <DataIndicator
                              isEmpty={isContributionsEmpty}
                              isValid={!isContributionsRequired}
                              sx={{ ...buttonItemStyle }}
                            />
                            Contributions
                          </a>
                        </Typography>
                        <Typography variant="body2" component="li">
                          <a href={`#${DESCRIPTIONS}`}>
                            <DataIndicator
                              isEmpty={isDescriptionsSectionEmpty}
                              isValid={isDescriptionsSectionFilled}
                              sx={{ ...buttonItemStyle }}
                            />
                            Descriptions
                          </a>
                        </Typography>
                        <Typography variant="body2" component="li">
                          <a href={`#${FUNDINGS}`}>
                            <DataIndicator
                              isEmpty={isFundingsEmpty}
                              isValid={!isFundingsRequired}
                              sx={{ ...buttonItemStyle }}
                            />
                            Fundings
                          </a>
                        </Typography>
                      </ul>
                    ),
                  }
                : undefined,
          }}
        />
      ))}
    </SpeedDial>
  );
};

export default WorkSpeedDial;
