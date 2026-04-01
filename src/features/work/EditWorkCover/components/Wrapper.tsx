'use client';

export const Wrapper = ({ children }: { children: Readonly<React.ReactNode> }) => {
  return (
    <div className="relative aspect-[1/1.5] h-auto max-h-[300px] w-full rounded bg-(--color-image-placeholder) xl:max-h-[450px]">
      {children}
    </div>
  );
};
