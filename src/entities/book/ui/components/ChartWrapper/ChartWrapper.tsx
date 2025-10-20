const ChartWrapper = ({ children }: { children: Readonly<React.ReactNode> }) => {
  return <div className="wrap flex justify-between gap-1">{children}</div>;
};

export default ChartWrapper;
