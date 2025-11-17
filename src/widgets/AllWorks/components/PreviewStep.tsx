import { Button, Table, TableRow, TableCell, TableBody, TableHeader } from '@/src/shared/ui';

type PreviewStepProps = {
  onPreviousStep: () => void;
};

export const PreviewStep = (props: PreviewStepProps) => {
  const { onPreviousStep } = props;

  return (
    <div>
      <Table className="border-separate">
        <TableHeader cells={['Title', 'Status', 'Type', 'Contributors']} />
        <TableBody>
          <TableRow>
            <TableCell>Title</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Contributors</TableCell>
          </TableRow>
        </TableBody>
        <Button onClick={onPreviousStep}>Previous Step</Button>
      </Table>
    </div>
  );
};
