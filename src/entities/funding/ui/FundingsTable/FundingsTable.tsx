import { Fragment } from 'react';

import { convertRorIdToText } from '@/src/shared';
import {
  Indicator,
  LinkTooltip,
  RorLogo,
  TableBody,
  TableCell,
  TableFormWrapper,
  TableHeader,
  TableRow,
  TableWrapper,
} from '@/src/shared/ui';

import { FundingEntity } from '../../model/funding.types';
import { RowButtonGroup } from './components/RowButtonGroup';

type FundingsTableProps = {
  activeFunding: FundingEntity | null;
  fundings: FundingEntity[];
  showRecommendations: boolean;
  form?: Readonly<React.ReactNode>;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
};

const FundingsTable = (props: FundingsTableProps) => {
  const { activeFunding, fundings, showRecommendations, form, onDelete, onEdit } = props;

  return (
    <TableWrapper>
      <TableHeader
        cells={['Project', 'Program', 'Institution', 'Grant No.']}
        cellStyles={['min-w-[120px] pl-4', 'min-w-[120px]', 'min-w-[250px]', 'min-w-[120px]']}
      />
      <TableBody>
        {fundings.map(
          ({ id, projectName, projectShortname, program, institutionName, institutionRor, grantNumber }) => (
            <Fragment key={id}>
              {activeFunding?.id === id ? (
                <TableFormWrapper colSpan={5}>{form}</TableFormWrapper>
              ) : (
                <TableRow className="group">
                  <TableCell className="firstCell">
                    <div className="flex items-center gap-1 pl-1">
                      {projectName}
                      {projectShortname.length > 0 && ` (${projectShortname})`}
                      {showRecommendations && grantNumber.length === 0 && <Indicator />}
                    </div>
                  </TableCell>
                  <TableCell className="middleCell">{program}</TableCell>
                  <TableCell className="middleCell">
                    {institutionName}
                    {institutionRor && (
                      <LinkTooltip link={institutionRor} linkText={convertRorIdToText(institutionRor)}>
                        <RorLogo />
                      </LinkTooltip>
                    )}
                  </TableCell>
                  <TableCell className="lastCell">
                    <div className="flex justify-between">
                      {grantNumber}
                      <RowButtonGroup className="ml-auto" onDelete={() => onDelete?.(id)} onEdit={() => onEdit?.(id)} />
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          ),
        )}
      </TableBody>
    </TableWrapper>
  );
};

export default FundingsTable;
