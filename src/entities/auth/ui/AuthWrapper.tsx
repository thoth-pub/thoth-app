import Image from 'next/image';

export const AuthWrapper = ({ children }: { children: Readonly<React.ReactNode> }) => {
  return (
    <div className="m-auto flex min-w-[250px] flex-col items-center justify-center gap-10 rounded-2xl p-4 lg:min-w-[320px]">
      <Image
        src="/logo.png"
        alt="Thoth Open Metadata logo"
        className="block min-h-[97px] min-w-[170px] shrink-0"
        width={170}
        height={97}
        priority
      />
      {children}
    </div>
  );
};
