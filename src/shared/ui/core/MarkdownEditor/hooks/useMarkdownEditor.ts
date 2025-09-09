'use client';

import { getStateFromTextArea, RefMDEditor, selectWord } from '@uiw/react-md-editor';
import { useRef } from 'react';

import type { TextEditorTagTypes } from '@/src/shared/interfaces';

type UseMarkdownEditorProps = Partial<{
  disableLineBreaks: boolean;
  onChange: (value?: string) => void;
}>;

export const useMarkdownEditor = ({ disableLineBreaks, onChange }: UseMarkdownEditorProps) => {
  const editorRef = useRef<RefMDEditor>(null);

  const handleTag = (tag: TextEditorTagTypes) => {
    if (editorRef.current) {
      // @ts-expect-error - commandOrchestrator is not typed
      const { textApi, textArea } = editorRef.current.commandOrchestrator;
      const state = getStateFromTextArea(textArea);

      // Adjust the selection to encompass the whole word if the caret is inside one
      const newSelectionRange = selectWord({
        text: state.text,
        selection: state.selection,
        prefix: '',
        suffix: '',
      });
      const state1 = textApi.setSelectionRange(newSelectionRange);
      // Replaces the current selection with the mark up
      const state2 = textApi.replaceSelection(`<${tag}>${state1.selectedText}</${tag}>`);
      // Adjust the selection to not contain the mark up
      textApi.setSelectionRange({
        start: state2.selection.end - 2 - state1.selectedText?.length,
        end: state2.selection.end - 4,
      });
    }
  };

  const handleChange = (value?: string) => {
    if (!onChange) return;

    if (!disableLineBreaks || !value) return onChange(value);

    onChange(value.replace(/\n/g, ''));
  };

  return {
    editorRef,
    customizeText: handleTag,
    update: handleChange,
  };
};
