import { AddButton, TableCell, TableFooter as TableFooterComponent, TableRow } from '@/src/shared/ui';

type TableFooterProps = {
  onAdd?: () => void;
};

export const TableFooter = ({ onAdd }: TableFooterProps) => {
  return (
    <TableFooterComponent>
      <TableRow>
        <TableCell className="border-none">
          <AddButton onAdd={onAdd}>Add Contributor</AddButton>
        </TableCell>
      </TableRow>
    </TableFooterComponent>
  );
};
