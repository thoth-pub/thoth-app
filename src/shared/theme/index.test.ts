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

// APP-CHIP-DELETE-SPACING-01 shared deletable-Chip spacing contract.
//
// MUI 7.3.5 gives a *small* Chip `label(padding: 0 8px)` and
// `deleteIcon(margin: 0 4px 0 -4px, fontSize: 16)` on a Chip root with
// `padding: 0` (`@mui/material/Chip/Chip.js`). The label's own 8px right padding
// is the gutter that MUI's -4px icon margin is designed to eat, which leaves 4px
// between the visible label and the delete icon, and 4px between the icon and
// the Chip's edge.
//
// Thoth deliberately uses a different layout model: the horizontal gutter lives
// on the Chip *root* (`padding`, with its own >=1280px value) and
// `.MuiChip-label` is explicitly zero-padded. Both halves of MUI's assumption
// therefore fail:
//
//   * the -4px icon margin has no label padding left to consume, so it pulls the
//     icon *onto* the label - measured at exactly 4px of overlap in a
//     production-faithful browser at 1024px and 1440px;
//   * the icon's 4px right margin is added on top of the root's own right
//     padding, double-counting spacing the root already owns (measured
//     icon-to-outer-edge 13px against label-to-outer-edge 9px below 1280px, and
//     17px against 13px above it).
//
// The shared correction restates the same two relationships in Thoth's model:
// the label-to-icon gap is supplied by the icon's left margin because the label
// no longer supplies it, and the icon's right margin is surrendered entirely
// because the root's padding is the only thing that should own outer spacing.
// The 16px delete-icon box is a fixed MUI pixel geometry at both breakpoints, so
// one margin pair serves both regimes.
//
// That 4px is derived from *small* geometry (8px label padding - 4px icon
// margin) and holds only there. MUI's medium/default Chip is a different system
// - `label(padding: 0 12px)`, `deleteIcon(margin: 0 5px 0 -6px, fontSize: 22)` -
// whose own relationship is 12 - 6 = 6px. Applying the small-derived pair to
// every size would silently redesign medium Chips on unmeasured numbers, so the
// override must name the small delete icon and nothing else. Medium/default
// delete-icon geometry is out of scope here and stays exactly as MUI ships it.
//
// These assertions read the theme's declared style-override tree. They pin the
// declared contract only; they are not browser pixel measurements.

const chipRootOverrides = theme.components?.MuiChip?.styleOverrides?.root as StyleNode | undefined;

const SMALL_DELETE_ICON_SELECTOR = '& .MuiChip-deleteIconSmall';
const LABEL_SELECTOR = '& .MuiChip-label';
const WIDE_BREAKPOINT_SELECTOR = '@media (min-width: 1280px)';

/**
 * Matches the size-agnostic `.MuiChip-deleteIcon` class without also matching
 * the size-qualified `.MuiChip-deleteIconSmall`/`-Medium` classes, which contain
 * it as a prefix.
 */
const UNQUALIFIED_DELETE_ICON_CLASS = /\.MuiChip-deleteIcon(?![\w-])/;

/** The shared small delete-icon declarations, if the theme states any. */
const smallDeleteIconOverrides = () => chipRootOverrides?.[SMALL_DELETE_ICON_SELECTOR] as StyleNode | undefined;

/** Every selector path in the MuiChip override tree that targets a delete icon. */
const deleteIconSelectorPaths = (node: unknown = chipRootOverrides, path: string[] = []): string[][] => {
  if (typeof node !== 'object' || node === null) {
    return [];
  }

  return Object.entries(node as StyleNode).flatMap(([key, child]) => {
    const here = key.includes('MuiChip-deleteIcon') ? [[...path, key]] : [];
    return [...here, ...deleteIconSelectorPaths(child, [...path, key])];
  });
};

describe('shared chip theme deletable-spacing contract', () => {
  it('keeps the root-padding / zero-label-padding layout model the correction is derived from', () => {
    expect(chipRootOverrides).toBeDefined();

    const root = chipRootOverrides as StyleNode;
    const wide = root[WIDE_BREAKPOINT_SELECTOR] as StyleNode;

    expect(root.padding).toBe('0.125rem 0.5rem');
    expect(wide.padding).toBe('0.25rem 0.75rem');
    expect(root[LABEL_SELECTOR]).toEqual({ padding: '0' });
  });

  it('states a small-specific delete-icon spacing rule rather than inheriting MUI small-Chip margins', () => {
    expect(smallDeleteIconOverrides()).toBeDefined();
  });

  it('gives the small delete icon the label-to-icon gap the zero-padded label can no longer supply', () => {
    // MUI's own small-Chip relationship is 8px label padding minus a 4px icon
    // margin, i.e. a 4px visible gap. With `padding: 0` on the label, the icon's
    // left margin *is* that gap, so it carries the whole 4px.
    expect(smallDeleteIconOverrides()?.marginLeft).toBe('4px');
  });

  it('surrenders the small delete icon right margin to the Chip root padding that already owns it', () => {
    // The root supplies 8px (12px at >=1280px) of right padding. Keeping MUI's
    // 4px icon right margin on top of that would double-count outer spacing.
    expect(smallDeleteIconOverrides()?.marginRight).toBe('0');
  });

  it('never carries the small-derived margins on a size-agnostic delete-icon selector', () => {
    // A bare `& .MuiChip-deleteIcon` rule would impose small geometry on every
    // Chip size, including medium, whose spacing was never measured here.
    const unqualified = deleteIconSelectorPaths().filter((path) =>
      UNQUALIFIED_DELETE_ICON_CLASS.test(path[path.length - 1]),
    );

    expect(unqualified).toEqual([]);
  });

  it('introduces no medium or default delete-icon override', () => {
    // The whole delete-icon surface this task owns is the small selector; MUI's
    // medium/default `margin: 0 5px 0 -6px` must reach the browser untouched.
    expect(deleteIconSelectorPaths().map((path) => path.join(' '))).toEqual([SMALL_DELETE_ICON_SELECTOR]);
  });

  it('never reintroduces a negative delete-icon margin', () => {
    const negativeMargins = Object.entries(smallDeleteIconOverrides() ?? {}).filter(
      ([property, value]) => property.startsWith('margin') && typeof value === 'string' && value.trim().startsWith('-'),
    );

    expect(negativeMargins).toEqual([]);
  });

  it('corrects horizontal spacing only, leaving Chip height, typography and vertical centring alone', () => {
    // The browser diagnosis measured chip/label/icon-box/glyph vertical centres
    // at 0.000px apart, so a vertical or sizing declaration here would be
    // correcting something that is not broken.
    expect(Object.keys(smallDeleteIconOverrides() ?? {})).toEqual(['marginLeft', 'marginRight']);
  });

  it('uses one delete-icon margin pair for both breakpoint regimes', () => {
    // The delete icon is a fixed 16px MUI box either side of the 1280px
    // breakpoint, so the gap does not need a breakpoint-specific value; only the
    // root padding scales.
    const wide = (chipRootOverrides as StyleNode)[WIDE_BREAKPOINT_SELECTOR] as StyleNode;

    expect(wide).not.toHaveProperty(SMALL_DELETE_ICON_SELECTOR);
    expect(JSON.stringify(smallDeleteIconOverrides() ?? {})).not.toContain('@media');
  });
});
