import { describe, expect, it } from 'vitest';

import { theme } from './index';

// APP-TABLE-UX-01 shared table-interaction contract.
//
// The application-wide MUI table theme used to give *every* table-body row a
// hover background and `cursor: pointer`, so purely informational rows claimed
// an interactivity they do not have. The convention is now explicit and
// code-visible: only a row that opts in with MUI's `hover` prop - and therefore
// carries the `MuiTableRow-hover` class - receives the interactive treatment.
//
// These assertions read the theme's own style-override tree rather than a
// rendered `:hover` state, because jsdom does not evaluate pseudo-class rules.

type StyleNode = Record<string, unknown>;

const MUI_HOVER_ROW_CLASS = 'MuiTableRow-hover';

const tableRootOverrides = theme.components?.MuiTable?.styleOverrides?.root as StyleNode | undefined;

/**
 * Walks a nested MUI style-override object and returns the full selector path
 * of every declaration that sets the given property to the given value.
 */
const findDeclarationPaths = (node: unknown, property: string, value: string, path: string[] = []): string[][] => {
  if (typeof node !== 'object' || node === null) {
    return [];
  }

  return Object.entries(node as StyleNode).flatMap(([key, child]) => {
    if (key === property) {
      return child === value ? [path] : [];
    }
    return findDeclarationPaths(child, property, value, [...path, key]);
  });
};

/** Every selector path in the theme that applies `cursor: pointer`. */
const pointerSelectorPaths = () => findDeclarationPaths(tableRootOverrides, 'cursor', 'pointer');

/** Every selector path in the theme that applies the interactive row background. */
const rowHoverBackgroundPaths = () =>
  findDeclarationPaths(tableRootOverrides, 'backgroundColor', 'var(--color-table-row-hover-background)');

describe('shared table theme row-interaction contract', () => {
  it('exposes table-body row styling to assert against', () => {
    expect(tableRootOverrides).toBeDefined();
    expect(Object.keys(tableRootOverrides as StyleNode)).toContain('& .MuiTableBody-root');
  });

  it('never applies a pointer cursor to a generic table-body row', () => {
    // A generic body-row selector is one that targets `.MuiTableRow-root`
    // without also requiring the explicit MUI hover-row opt-in class.
    const genericBodyRowPointerPaths = pointerSelectorPaths().filter((path) => {
      const selector = path.join(' ');
      return selector.includes('.MuiTableRow-root') && !selector.includes(MUI_HOVER_ROW_CLASS);
    });

    expect(genericBodyRowPointerPaths).toEqual([]);
  });

  it('scopes every pointer cursor it does apply to the explicit hover-row class', () => {
    const paths = pointerSelectorPaths();

    expect(paths.length).toBeGreaterThan(0);
    paths.forEach((path) => {
      expect(path.join(' ')).toContain(MUI_HOVER_ROW_CLASS);
    });
  });

  it('scopes the interactive hover background to the explicit hover-row class', () => {
    const paths = rowHoverBackgroundPaths();

    expect(paths.length).toBeGreaterThan(0);
    paths.forEach((path) => {
      expect(path.join(' ')).toContain(MUI_HOVER_ROW_CLASS);
    });
  });

  it('leaves no unconditional table-body row hover rule behind', () => {
    const tableBody = (tableRootOverrides as StyleNode)['& .MuiTableBody-root'] as StyleNode;

    // The old unconditional selector must be gone entirely, not merely emptied,
    // and no sibling selector may reintroduce whole-row interactivity.
    expect(tableBody).not.toHaveProperty('& .MuiTableRow-root:hover');
    Object.keys(tableBody).forEach((selector) => {
      if (selector.includes(':hover')) {
        expect(selector).toContain(MUI_HOVER_ROW_CLASS);
      }
    });
  });
});
