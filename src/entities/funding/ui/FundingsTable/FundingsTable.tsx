import { Fragment } from 'react';

import { convertRorIdToText } from '@/src/shared';
import {
  Indicator,
  LinkTooltip,
  RorLogo,
  Table,
  TableBody,
  TableCell,
  TableFormWrapper,
  TableHeader,
  TableRow,
} from '@/src/shared/ui';

import { FundingEntity } from '../../model/funding.types';
import { RowButtonGroup } from './components/RowButtonGroup';

type FundingsTableProps = {
  activeFunding: FundingEntity | null;
  fundings: FundingEntity[];
  showRecommendations: boolean;
  form: Readonly<React.ReactNode>;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
};

const FundingsTable = (props: FundingsTableProps) => {
  const { activeFunding, fundings, showRecommendations, form, onDelete, onEdit } = props;

  return (
    <div className="overflow-auto">
      <Table className="border-separate">
        <TableHeader
          cells={['Project', 'Program', 'Institution', 'Grant']}
          cellStyles={['min-w-[120px]', 'min-w-[120px]', 'min-w-[250px]', 'min-w-[120px]']}
        />
        <TableBody>
          {fundings.map(({ id, projectName, program, institutionName, institutionRor, grantNumber }) => (
            <Fragment key={id}>
              {activeFunding?.id === id ? (
                <TableFormWrapper colSpan={5}>{form}</TableFormWrapper>
              ) : (
                <TableRow className="group">
                  <TableCell className="rounded-tl-2xl rounded-bl-2xl border-1 border-r-0 border-transparent pl-7 capitalize group-hover:border-t-[var(--color-form-border)] group-hover:border-b-[var(--color-form-border)] group-hover:border-l-[var(--color-form-border)]">
                    <div className="flex items-center gap-1">
                      {projectName}
                      {showRecommendations && grantNumber.length === 0 && <Indicator />}
                    </div>
                  </TableCell>
                  <TableCell className="border-t-1 border-b-1 border-transparent group-hover:border-t-[var(--color-form-border)] group-hover:border-b-[var(--color-form-border)]">
                    {program}
                  </TableCell>
                  <TableCell className="border-t-1 border-b-1 border-transparent group-hover:border-t-[var(--color-form-border)] group-hover:border-b-[var(--color-form-border)]">
                    {institutionName}
                    {institutionRor && (
                      <LinkTooltip link={institutionRor} linkText={convertRorIdToText(institutionRor)}>
                        <RorLogo />
                      </LinkTooltip>
                    )}
                  </TableCell>
                  <TableCell className="rounded-tr-2xl rounded-br-2xl border-1 border-l-0 border-transparent group-hover:border-t-[var(--color-form-border)] group-hover:border-r-[var(--color-form-border)] group-hover:border-b-[var(--color-form-border)]">
                    <div className="flex justify-between">
                      {grantNumber}
                      <RowButtonGroup className="ml-auto" onDelete={() => onDelete?.(id)} onEdit={() => onEdit?.(id)} />
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default FundingsTable;
