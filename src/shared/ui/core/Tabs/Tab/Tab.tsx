import Tab, { type TabProps } from '@mui/material/Tab';

function a11yProps(value: string | number) {
  return {
    id: `full-width-tab-${value}`,
    'aria-controls': `full-width-tabpanel-${value}`,
  };
}

const TabComponent = (props: TabProps & { index: number }) => {
  const { index, value, ...restProps } = props;

  return <Tab {...restProps} value={value} {...a11yProps(value)} />;
};

export default TabComponent;
