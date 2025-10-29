import { Modal, TableRow } from '@mui/material';
import { TableCell } from '@mui/material';

import { useIsDesktop } from '@/src/shared/hooks';

import ModalWrapper from '../../core/ModalWrapper/ModalWrapper';

const TableFormWrapper = ({ children, colSpan }: { children: React.ReactNode; colSpan: number }) => {
  const isDesktop = useIsDesktop();

  return (
    <>
      {isDesktop ? (
        <TableRow className="w-full bg-[var(--color-table-edit-row-form-background)]">
          <TableCell colSpan={colSpan} className="rounded-2xl border-1 border-[var(--color-form-border)]">
            {children}
          </TableCell>
        </TableRow>
      ) : (
        <Modal open>
          <ModalWrapper>{children}</ModalWrapper>
        </Modal>
      )}
    </>
  );
};

export default TableFormWrapper;
