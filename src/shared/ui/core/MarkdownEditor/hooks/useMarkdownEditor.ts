'use client';

import { getStateFromTextArea, RefMDEditor, selectWord } from '@uiw/react-md-editor';
import { useRef } from 'react';

import { TextEditorTag } from '@/src/shared/constants';
import type { TextEditorTagTypes } from '@/src/shared/interfaces';

type UseMarkdownEditorProps = Partial<{
  disableLineBreaks: boolean;
  maxCharsLimit: number;
  onChange: (value?: string) => void;
}>;

export const useMarkdownEditor = ({ disableLineBreaks, maxCharsLimit, onChange }: UseMarkdownEditorProps) => {
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

    if (isList) {
      const listType = tag === TextEditorTag.ORDERED_LIST ? 'order' : 'bullet';
      const openTag = `<list list-type="${listType}">`;
      const closeTag = '</list>';
      const selected: string = state1.selectedText ?? '';
      const lines = selected
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        // Empty selection: insert a single empty item and drop the caret inside the <p></p>
        const inserted = `${openTag}<list-item><p></p></list-item>${closeTag}`;
        const state2 = textApi.replaceSelection(inserted);
        const caret = state2.selection.end - '</p></list-item></list>'.length;
        textApi.setSelectionRange({ start: caret, end: caret });

        return;
      }

      const items = lines.map((line) => `<list-item><p>${line}</p></list-item>`).join('');
      const inserted = `${openTag}${items}${closeTag}`;
      const state2 = textApi.replaceSelection(inserted);
      // Select the list content (between <list ...> and </list>)
      textApi.setSelectionRange({
        start: state2.selection.end - inserted.length + openTag.length,
        end: state2.selection.end - closeTag.length,
      });

      return;
    }

    const addLineBreak = isParagraph && state.text.length > 0;

    // Replaces the current selection with the mark up
    const state2 = textApi.replaceSelection(
      `${addLineBreak ? '\n' : ''}<${tag}${isLink ? ' xlink:href="#"' : ''}>${state1.selectedText}</${tag.split(' ')[0].trim()}>`,
    );
    const startValue = 2;
    const endValue = 4;
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

    let processed = value;

    if (disableLineBreaks && processed) {
      processed = processed.replace(/\n/g, '');
    }

    if (maxCharsLimit && processed && processed.length > maxCharsLimit) return;

    onChange(processed);
  };

  return {
    editorRef,
    customizeText: handleTag,
    update: handleChange,
    toggleTextCase,
  };
};
