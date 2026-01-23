type TabPanelProps = {
  children?: Readonly<React.ReactNode>;
  activeValue: string;
  value: string;
  index: number;
};

const TabPanel = (props: TabPanelProps) => {
  const { children, value, activeValue } = props;

  const isActive = value === activeValue;

  return (
    <div
      role="tabpanel"
      hidden={!isActive}
      id={`full-width-tabpanel-${value}`}
      aria-labelledby={`full-width-tab-${value}`}
    >
      {children}
    </div>
  );
};

export default TabPanel;
