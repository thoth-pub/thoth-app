import React from 'react';

const BooksListWrapper = ({ children }: { children: Readonly<React.ReactNode> }) => {
  return <ul className="flex flex-wrap gap-[15px]">{children}</ul>;
};

export default BooksListWrapper;
