import { Table, TableRow, TableCell, TableBody, TableHeader } from '@/src/shared/ui';

export const PreviewStep = () => {
  return (
    <Table className="border-separate">
      <TableHeader cells={['Title', 'Status', 'Type', 'Contributors', 'Doi', 'Isbn']} />
      <TableBody>
        <TableRow>
          <TableCell>Title</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Type</TableCell>
          <TableCell>Contributors</TableCell>
          <TableCell>Doi</TableCell>
          <TableCell>Isbn</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
};
