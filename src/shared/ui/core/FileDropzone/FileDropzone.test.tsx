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
});
