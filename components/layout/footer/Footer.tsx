import { FooterLinks } from './components';

const Footer = () => {
  return (
    <footer className="min-h-[var(--footer-height)] border-t-2 border-t-[var(--color-border)] py-3.5">
      <div className="m-auto flex max-w-[var(--max-width)] flex-wrap items-center justify-between gap-4 px-[var(--side-padding)]">
        <FooterLinks />
      </div>
    </footer>
  );
};

export default Footer;
