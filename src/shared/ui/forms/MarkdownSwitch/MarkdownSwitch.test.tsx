import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material';
import { useForm } from 'react-hook-form';

import MarkdownSwitch from './MarkdownSwitch';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={createTheme()}>{children}</ThemeProvider>;
}

function TestForm() {
  const { control } = useForm({ defaultValues: { testSwitch: false } });

  return (
    <Wrapper>
      <MarkdownSwitch control={control} name="testSwitch" />
    </Wrapper>
  );
}

describe('MarkdownSwitch', () => {
  it('renders Text and Jats labels', () => {
    render(<TestForm />);
    expect(screen.getByText('Text')).toBeTruthy();
    expect(screen.getByText('Jats')).toBeTruthy();
  });

  it('renders a switch', () => {
    render(<TestForm />);
    const switches = document.querySelectorAll('[class*="MuiSwitch"]');
    expect(switches.length).toBeGreaterThan(0);
  });
});
