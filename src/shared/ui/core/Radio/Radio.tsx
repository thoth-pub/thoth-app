import Radio, { type RadioProps } from '@mui/material/Radio';

export type { RadioProps };

const RadioComponent = (props: RadioProps) => {
  return <Radio {...props} />;
};

export default RadioComponent;
