import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import FileDropzone from './FileDropzone';

const file = new File(['file'], 'book.pdf', { type: 'application/pdf' });

const renderDropzone = (overrides: Partial<React.ComponentProps<typeof FileDropzone>> = {}) => {
  const onFileSelect = vi.fn();
  const onDisabledAction = vi.fn();
  const result = render(
    <FileDropzone
      accept={['application/pdf']}
      actionLabel="Browse file"
      dragActiveLabel="Drop file here"
      onDisabledAction={onDisabledAction}
      onFileSelect={onFileSelect}
      {...overrides}
    >
      <span>Instructions</span>
    </FileDropzone>,
  );

  return {
    ...result,
    dropzone: result.container.firstElementChild as HTMLElement,
    input: result.container.querySelector('input[type="file"]') as HTMLInputElement,
    onDisabledAction,
    onFileSelect,
  };
};

const drop = (dropzone: HTMLElement, files: File[]) => {
  const event = createEvent.drop(dropzone);
  Object.defineProperty(event, 'dataTransfer', { value: { files } });
  const preventDefault = vi.spyOn(event, 'preventDefault');
  fireEvent(dropzone, event);
  return preventDefault;
};

describe('FileDropzone', () => {
  afterEach(cleanup);

  it('selects exactly the first browsed file and resets for same-file reselection', () => {
    const { input, onFileSelect } = renderDropzone();

    fireEvent.change(input, { target: { files: [file, new File(['other'], 'other.pdf')] } });
    expect(onFileSelect).toHaveBeenCalledTimes(1);
    expect(onFileSelect).toHaveBeenLastCalledWith(file);
    expect(input.value).toBe('');

    fireEvent.change(input, { target: { files: [file] } });
    expect(onFileSelect).toHaveBeenCalledTimes(2);
    expect(onFileSelect).toHaveBeenLastCalledWith(file);
  });

  it('selects exactly the first dropped file and prevents browser navigation', () => {
    const { dropzone, onFileSelect } = renderDropzone();
    const preventDefault = drop(dropzone, [file, new File(['other'], 'other.pdf')]);

    expect(preventDefault).toHaveBeenCalled();
    expect(onFileSelect).toHaveBeenCalledTimes(1);
    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it('keeps drag state active across nested enter and leave events', () => {
    const { dropzone } = renderDropzone();

    fireEvent.dragEnter(dropzone);
    fireEvent.dragEnter(dropzone);
    expect(dropzone.dataset.dragActive).toBe('true');

    fireEvent.dragLeave(dropzone);
    expect(dropzone.dataset.dragActive).toBe('true');
    fireEvent.dragLeave(dropzone);
    expect(dropzone.dataset.dragActive).toBe('false');
  });

  it('keeps drag depth valid after stray leave events', () => {
    const { dropzone } = renderDropzone();

    fireEvent.dragLeave(dropzone);
    fireEvent.dragLeave(dropzone);
    fireEvent.dragEnter(dropzone);
    expect(dropzone.dataset.dragActive).toBe('true');

    fireEvent.dragLeave(dropzone);
    expect(dropzone.dataset.dragActive).toBe('false');
  });

  it('resets drag state on drop', () => {
    const { dropzone } = renderDropzone();

    fireEvent.dragEnter(dropzone);
    expect(dropzone.dataset.dragActive).toBe('true');

    drop(dropzone, [file]);
    expect(dropzone.dataset.dragActive).toBe('false');
  });

  it('prevents dragover default navigation', () => {
    const { dropzone } = renderDropzone();
    const event = createEvent.dragOver(dropzone);
    const preventDefault = vi.spyOn(event, 'preventDefault');

    fireEvent(dropzone, event);

    expect(preventDefault).toHaveBeenCalled();
  });

  it('does not submit through browse or drop while disabled', () => {
    const { dropzone, onDisabledAction, onFileSelect } = renderDropzone({ disabled: true });

    fireEvent.click(screen.getByRole('button', { name: 'Browse file' }));
    drop(dropzone, [file]);

    expect(onFileSelect).not.toHaveBeenCalled();
    expect(onDisabledAction).toHaveBeenCalledTimes(2);
  });

  it('does not submit or run the disabled callback while loading', () => {
    const { dropzone, input, onDisabledAction, onFileSelect } = renderDropzone({ loading: true });

    expect(input).toBeDisabled();
    fireEvent.change(input, { target: { files: [file] } });
    drop(dropzone, [file]);

    expect(onFileSelect).not.toHaveBeenCalled();
    expect(onDisabledAction).not.toHaveBeenCalled();
  });

  it('gives loading precedence over the disabled action callback', () => {
    const { dropzone, input, onDisabledAction, onFileSelect } = renderDropzone({
      disabled: true,
      loading: true,
    });

    fireEvent.change(input, { target: { files: [file] } });
    drop(dropzone, [file]);

    expect(onFileSelect).not.toHaveBeenCalled();
    expect(onDisabledAction).not.toHaveBeenCalled();
  });

  it('silently locks browse, drop, and the hidden input while busy', () => {
    const { dropzone, input, onDisabledAction, onFileSelect } = renderDropzone({ busy: true });

    expect(input).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Browse file' })).toBeDisabled();

    fireEvent.change(input, { target: { files: [file] } });
    drop(dropzone, [file]);

    expect(onFileSelect).not.toHaveBeenCalled();
    expect(onDisabledAction).not.toHaveBeenCalled();
  });

  it('gives busy precedence over the disabled action callback', () => {
    const { dropzone, input, onDisabledAction, onFileSelect } = renderDropzone({ busy: true, disabled: true });

    fireEvent.change(input, { target: { files: [file] } });
    drop(dropzone, [file]);

    expect(onFileSelect).not.toHaveBeenCalled();
    expect(onDisabledAction).not.toHaveBeenCalled();
  });

  it('restores selection once busy ends', () => {
    const onFileSelect = vi.fn();
    const props = {
      accept: ['application/pdf'],
      actionLabel: 'Browse file',
      dragActiveLabel: 'Drop file here',
      onFileSelect,
    };
    const { container, rerender } = render(<FileDropzone {...props} busy />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });
    expect(onFileSelect).not.toHaveBeenCalled();

    rerender(<FileDropzone {...props} busy={false} />);

    expect(input).not.toBeDisabled();
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFileSelect).toHaveBeenCalledWith(file);
  });
});
