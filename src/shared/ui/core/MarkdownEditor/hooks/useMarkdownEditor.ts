'use client';

import { getStateFromTextArea, RefMDEditor, selectWord } from '@uiw/react-md-editor';
import { useRef } from 'react';

import { TextEditorTag } from '@/src/shared/constants';
import type { TextEditorTagTypes } from '@/src/shared/interfaces';

type UseMarkdownEditorProps = Partial<{
  disableLineBreaks: boolean;
  onChange: (value?: string) => void;
}>;

export const useMarkdownEditor = ({ disableLineBreaks, onChange }: UseMarkdownEditorProps) => {
  const editorRef = useRef<RefMDEditor>(null);

  const handleTag = (tag: TextEditorTagTypes) => {
    if (!editorRef.current) return;
    // @ts-expect-error - commandOrchestrator is not typed
    const { textApi, textArea } = editorRef.current.commandOrchestrator;
    const state = getStateFromTextArea(textArea);
    const isLink = tag === TextEditorTag.LINK;
    const isList = tag === TextEditorTag.UNORDERED_LIST || tag === TextEditorTag.ORDERED_LIST;
    const isParagraph = tag === TextEditorTag.PARAGRAPH;

    // Adjust the selection to encompass the whole word if the caret is inside one
    const newSelectionRange = selectWord({
      text: state.text,
      selection: state.selection,
      prefix: '',
      suffix: '',
    });
    const state1 = textApi.setSelectionRange(newSelectionRange);

    const addLineBreak = isParagraph && state.text.length > 0;

    // Replaces the current selection with the mark up
    const state2 = textApi.replaceSelection(
      `${addLineBreak ? '\n' : ''}<${tag}${isLink ? ' ext-link-type="uri" xlink:href="#"' : ''}>${state1.selectedText}</${tag.split(' ')[0].trim()}>`,
    );
    const startValue = isList ? 4 : 2;
    const endValue = isList ? 5 : 4;
    // Adjust the selection to not contain the mark up
    textApi.setSelectionRange({
      start: state2.selection.end - startValue - state1.selectedText?.length,
      end: state2.selection.end - endValue,
    });
  };

  const toggleTextCase = () => {
    if (!editorRef.current) return;
    // @ts-expect-error - commandOrchestrator is not typed
    const { textApi, textArea } = editorRef.current.commandOrchestrator;
    const state = getStateFromTextArea(textArea);

    const isUppercase = state.selectedText === state.selectedText.toUpperCase();

    textApi.replaceSelection(isUppercase ? state.selectedText.toLowerCase() : state.selectedText.toUpperCase());
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
    toggleTextCase,
  };
};
