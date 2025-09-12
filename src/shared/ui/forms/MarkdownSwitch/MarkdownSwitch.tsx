import Switch, { type SwitchProps } from '../../core/Switch/Switch';
import Typography from '../../core/Typography/Typography';

const MarkdownSwitch = (props: Omit<SwitchProps, 'size'>) => {
  return (
    <div className="flex items-start gap-1 pt-2">
      <Typography variant="body2" color="primary">
        JATS
      </Typography>
      <Switch size="small" className="-mt-0.5" {...props} />
      <Typography variant="body2" color="primary">
        Markdown
      </Typography>
    </div>
  );
};

export default MarkdownSwitch;
