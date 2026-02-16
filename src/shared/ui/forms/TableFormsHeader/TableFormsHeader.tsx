import { CloseButton, SubmitButton, TranslatedContent, Typography } from '@/src/shared/ui';

type TableFormsHeaderProps = {
  title: string;
  children?: Readonly<React.ReactNode>;
  onDone?: () => void;
  onClose?: () => void;
};

const TableFormsHeader = ({ title, children, onDone, onClose }: TableFormsHeaderProps) => {
  return (
    <div className="flex justify-between">
      <Typography variant="h2" component="h3" className="flex items-center gap-1 text-(--color-typography)">
        <TranslatedContent content={title} />
        {children}
      </Typography>
      <div className="flex gap-1">
        <SubmitButton type="button" onClick={onDone} />
        <CloseButton onClose={onClose} />
      </div>
    </div>
  );
};

export default TableFormsHeader;
