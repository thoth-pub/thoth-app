const BooksListWrapper = ({ children }: { children: Readonly<React.ReactNode> }) => {
  return <ul className="flex min-h-[7.5rem] flex-wrap gap-[15px] lg:min-h-[10rem]">{children}</ul>;
};

export default BooksListWrapper;
