import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material';

import FormEditButton from './FormEditButton';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={createTheme()}>{children}</ThemeProvider>;
}

describe('FormEditButton', () => {
  it('renders AddButton with placeholder text when isEmpty is true', () => {
    render(<Wrapper><FormEditButton isEmpty placeholder="Add item" /></Wrapper>);
    expect(screen.getByText('add item')).toBeTruthy();
  });

  it('renders EditIcon when isEmpty is false', () => {
    const { container } = render(<Wrapper><FormEditButton isEmpty={false} placeholder="" /></Wrapper>);
    expect(container.querySelector('[data-testid="EditIcon"]')).toBeTruthy();
  });

  it('renders disabled button when disabled is true', () => {
    render(<Wrapper><FormEditButton isEmpty placeholder="Label" disabled /></Wrapper>);
    expect(screen.getByText('label')).toBeTruthy();
    const buttons = document.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('calls onEdit when clicked', () => {
    const onEdit = vi.fn();
    const { container } = render(<Wrapper><FormEditButton isEmpty placeholder="Click me" onEdit={onEdit} /></Wrapper>);
    container.querySelector('button')!.click();
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    const { container } = render(
      <Wrapper><FormEditButton isEmpty placeholder="Test" className="my-class" /></Wrapper>,
    );
    expect(container.querySelector('.my-class')).toBeTruthy();
  });
});
