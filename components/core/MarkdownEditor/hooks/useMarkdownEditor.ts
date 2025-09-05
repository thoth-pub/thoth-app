'use client';

import { getStateFromTextArea, RefMDEditor, selectWord } from '@uiw/react-md-editor';
import { useRef } from 'react';

import type { TextEditorTag } from '@/interfaces';

type UseMarkdownEditorProps = Partial<{
  disableLineBreaks: boolean;
  onUpdate: (value?: string) => void;
}>;

export const useMarkdownEditor = ({ disableLineBreaks, onUpdate }: UseMarkdownEditorProps) => {
  const editorRef = useRef<RefMDEditor>(null);

  const handleTag = (tag: TextEditorTag) => {
    if (editorRef.current) {
      // @ts-expect-error - commandOrchestrator is not typed
      const { textApi, textArea } = editorRef.current.commandOrchestrator;
      const state = getStateFromTextArea(textArea);

      console.log('REF:', editorRef.current);
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
    if (!onUpdate || !value) return;

    if (!disableLineBreaks) return onUpdate(value);

    onUpdate(value.replace(/\n/g, ' '));
  };

  return {
    editorRef,
    customizeText: handleTag,
    update: handleChange,
  };
};
