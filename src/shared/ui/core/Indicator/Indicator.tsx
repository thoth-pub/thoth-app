const Indicator = () => {
  return (
    <div className="relative flex size-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-success)] opacity-75"></span>
      <span className="relative inline-flex size-2 rounded-full bg-[var(--color-success)]"></span>
    </div>
  );
};

export default Indicator;
