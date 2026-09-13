import type { Element } from 'slimdom';

import { type CharacterClassSet, createCharacterClassSet } from './characterClasses';
import type { Ruleset, StrictRule } from './ruleset';

/**
 * Accelerators A1-A8 (thoth-app#196, SPIKE-03 reconciliation-2 `accel_r.mjs`):
 * exact fast paths for a handful of hot strict assertions, under the
 * canonical semantics of the merged evaluator (strict `and`/`or`, schema-typed
 * list atomisation, `$value` binding of simple-type assertions, XSD regex
 * classes derived from the engine itself).
 *
 * A fast path is bound to a rule only when the rule's identity and exact
 * normalised test text match the pinned official assertion; it returns
 * `undefined` whenever a precondition that guarantees an error-free, hence
 * laziness-independent, evaluation is not met, and the canonical evaluator
 * then decides that node. Nothing here is a source-validity rule.
 */
export type StrictFastPath = (element: Element) => boolean | undefined;

export type AcceleratorFamily = 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6' | 'A7' | 'A8';

export interface StrictAccelerators {
  readonly byRule: ReadonlyMap<StrictRule, StrictFastPath>;
  /** Distinct rule ids bound per family (a type-level assertion binds once per owner element). */
  readonly families: Readonly<Record<AcceleratorFamily, readonly string[]>>;
}

const normalise = (text: string) => text.replace(/\s+/g, ' ').trim();

const children = (element: Element, namespace: string | null, name: string): Element[] => {
  const out: Element[] = [];
  for (let c = element.firstChild; c; c = c.nextSibling) {
    if (c.nodeType === 1 && (c as Element).localName === name && (c as Element).namespaceURI === namespace) {
      out.push(c as Element);
    }
  }
  return out;
};
const path2 = (e: Element, ns: string | null, a: string, b: string) =>
  children(e, ns, a).flatMap((x) => children(x, ns, b));
const path3 = (e: Element, ns: string | null, a: string, b: string, c: string) =>
  path2(e, ns, a, b).flatMap((x) => children(x, ns, c));
const path4 = (e: Element, ns: string | null, a: string, b: string, c: string, d: string) =>
  path3(e, ns, a, b, c).flatMap((x) => children(x, ns, d));

/** `$value` of a list-typed simple-type assertion: the whitespace-collapsed tokens (exactly as `evaluateStrictRule` binds it). */
const valueTokens = (element: Element): string[] => {
  const collapsed = (element.textContent ?? '')
    .replace(/[\t\n\r]/g, ' ')
    .replace(/ +/g, ' ')
    .trim();
  return collapsed === '' ? [] : collapsed.split(' ');
};
/** Typed atomisation of one list-typed element: `tokenize(normalize-space(string($n)), ' ')` (XML whitespace only). */
const listTokens = (element: Element): string[] => {
  const s = (element.textContent ?? '').replace(/[ \t\n\r]+/g, ' ').trim();
  return s === '' ? [] : s.split(' ');
};
/** Characters that are not literal in an XSD regex outside a character class. */
const REGEX_META = /[\\.[\]{}()*+?|^$]/;
const allUnique = (tokens: readonly string[]) => new Set(tokens).size === tokens.length;
/** A no-namespace `textformat` attribute node (what `@textformat` selects), or `null`. */
const textformat = (element: Element) => {
  const attribute = element.getAttributeNode('textformat');
  return attribute && attribute.namespaceURI == null ? attribute : null;
};

const BODY = {
  A1: 'count($value) eq count(distinct-values($value))',
  A2: "not($value = 'WORLD') or count($value) eq 1",
  A3:
    "count(tokenize(string-join(SalesRights/Territory/CountriesIncluded, ' '), ' ')) eq " +
    "count(distinct-values(tokenize(string-join(SalesRights/Territory/CountriesIncluded, ' '), ' ')))",
  A4:
    "not(exists(PublishingDetail/SalesRights[matches(SalesRightsType, '^(01|02)$')]) and exists(ProductSupply/Market)) or " +
    "(every $country in tokenize(string-join(ProductSupply/Market/Territory/CountriesIncluded, ' '), ' ') satisfies " +
    "(exists(PublishingDetail/SalesRights[matches(SalesRightsType, '^(01|02)$')]/Territory[matches(string(CountriesIncluded), $country)]) or " +
    "exists(PublishingDetail/SalesRights[matches(SalesRightsType, '^(01|02)$')]/Territory[RegionsIncluded = 'WORLD'][not(matches(string(CountriesExcluded), $country))])))",
  A5: "matches(., '\\S')",
  A6: "not(matches(@textformat, '^(02|03)$')) or matches(replace(., '(<|&lt;)/?[A-Za-z][^(>|&gt;)]*(>|&gt;)', ''), '\\S')",
  A7: "matches(@textformat, '^(02|03|05)$') or not(matches(., '</?[A-Za-z][^>]*>'))",
  A8: "not(exists(@textformat)) or (@textformat ne '07') or matches(., '^(\\n|\\r|\\t|[ -~])+$')",
} as const;

const classRanges = (classes: CharacterClassSet, pattern: string): string | null => {
  const klass = classes.ranges(pattern);
  return klass
    ? klass
        .map(([lo, hi]) => (lo === hi ? `\\u{${lo.toString(16)}}` : `\\u{${lo.toString(16)}}-\\u{${hi.toString(16)}}`))
        .join('')
    : null;
};

export function createStrictAccelerators(
  ruleset: Ruleset,
  classes: CharacterClassSet = createCharacterClassSet(),
): StrictAccelerators {
  const ns = ruleset.xpathDefaultNamespace;
  const byRule = new Map<StrictRule, StrictFastPath>();
  const families: Record<AcceleratorFamily, string[]> = {
    A1: [],
    A2: [],
    A3: [],
    A4: [],
    A5: [],
    A6: [],
    A7: [],
    A8: [],
  };
  const rules = [...ruleset.byElement.values()].flat();
  const bind = (family: AcceleratorFamily, rule: StrictRule, fastPath: StrictFastPath) => {
    if (rule.compileError) return;
    byRule.set(rule, fastPath);
    if (!families[family].includes(rule.id)) families[family].push(rule.id);
  };
  /** Bound by exact id and exact normalised body. */
  const registerById = (
    family: AcceleratorFamily,
    id: string,
    body: string,
    variety: 'list' | null,
    fastPath: StrictFastPath,
  ) => {
    for (const rule of rules) {
      if (rule.id === id && normalise(rule.body) === normalise(body) && rule.valueVariety === variety)
        bind(family, rule, fastPath);
    }
  };
  /** Bound by exact normalised body on every context-item assertion carrying it. */
  const registerByBody = (family: AcceleratorFamily, body: string, fastPath: StrictFastPath) => {
    for (const rule of rules) {
      if (rule.valueVariety === null && normalise(rule.body) === normalise(body)) bind(family, rule, fastPath);
    }
  };

  // A1: uniqueness of the whitespace-collapsed CountryCodeList / RegionCodeList tokens ($value binding, no error path).
  registerById('A1', '_20171126_h_1', BODY.A1, 'list', (e) => allUnique(valueTokens(e)));
  registerById('A1', '_20171126_h_3', BODY.A1, 'list', (e) => allUnique(valueTokens(e)));
  // A2: WORLD alone; both operands of the strict `or` are total.
  registerById('A2', '_20171126_h_2', BODY.A2, 'list', (e) => {
    const tokens = valueTokens(e);
    return !tokens.includes('WORLD') || tokens.length === 1;
  });
  // A3: countries unique across the typed-list tokens of every SalesRights/Territory/CountriesIncluded.
  registerById('A3', '_20170517_g_1', BODY.A3, null, (e) =>
    allUnique(path3(e, ns, 'SalesRights', 'Territory', 'CountriesIncluded').flatMap(listTokens)),
  );
  // A4: every Market country covered by for-sale SalesRights. Every construct that could raise under the canonical
  // evaluation (matches()/string() over a 2+ item sequence, a non-literal token) sends the node to the canonical path.
  registerById('A4', '_20180109_h_1', BODY.A4, null, (e) => {
    const forSale: Element[] = [];
    for (const salesRights of path2(e, ns, 'PublishingDetail', 'SalesRights')) {
      const types = children(salesRights, ns, 'SalesRightsType');
      if (types.length > 1) return undefined;
      if (types.length === 1) {
        const value = types[0].textContent ?? '';
        if (value === '01' || value === '02') forSale.push(salesRights);
      }
    }
    const tokens = path4(e, ns, 'ProductSupply', 'Market', 'Territory', 'CountriesIncluded').flatMap(listTokens);
    for (const token of tokens) if (token === '' || REGEX_META.test(token)) return undefined;
    const territories: { included: string; excluded: string; world: boolean }[] = [];
    for (const salesRights of forSale) {
      for (const territory of children(salesRights, ns, 'Territory')) {
        const included = children(territory, ns, 'CountriesIncluded');
        const excluded = children(territory, ns, 'CountriesExcluded');
        if (included.length > 1 || excluded.length > 1) return undefined;
        territories.push({
          included: included.length ? (included[0].textContent ?? '') : '',
          excluded: excluded.length ? (excluded[0].textContent ?? '') : '',
          world: children(territory, ns, 'RegionsIncluded').some((r) => listTokens(r).includes('WORLD')),
        });
      }
    }
    const markets = path2(e, ns, 'ProductSupply', 'Market');
    const first = !(forSale.length > 0 && markets.length > 0);
    let second = true;
    for (const token of tokens) {
      let covered = territories.some((t) => t.included.includes(token));
      if (!covered) covered = territories.some((t) => t.world && !t.excluded.includes(token));
      if (!covered) {
        second = false;
        break;
      }
    }
    return first || second;
  });

  const S = classes.bit('\\S');
  if (S !== undefined) {
    // A5: "must not be empty or consist solely of white space" on the element string value.
    registerByBody('A5', BODY.A5, (e) => classes.scan(e.textContent ?? '', S) === S);
    const AZ = classRanges(classes, '[A-Za-z]');
    const NG = classRanges(classes, '[^(>|&gt;)]');
    const NGT = classRanges(classes, '[^>]');
    const ASCII = classes.bit('(\\n|\\r|\\t|[ -~])');
    // A6: "not empty or solely white space and markup": both operands evaluated; absent @textformat => not(()) is true.
    if (AZ && NG) {
      const MARKUP = new RegExp(`(<|&lt;)\\/?[${AZ}][${NG}]*(>|&gt;)`, 'gu');
      registerByBody('A6', BODY.A6, (e) => {
        const tf = textformat(e);
        const first = !(tf && (tf.value === '02' || tf.value === '03'));
        const second = classes.scan((e.textContent ?? '').replace(MARKUP, ''), S) === S;
        return first || second;
      });
    }
    // A7: "no (X)HTML markup with default text format or 06/07": absent @textformat => matches(()) is false.
    if (AZ && NGT) {
      const TAG = new RegExp(`<\\/?[${AZ}][${NGT}]*>`, 'u');
      registerByBody('A7', BODY.A7, (e) => {
        const tf = textformat(e);
        const first = !!(tf && (tf.value === '02' || tf.value === '03' || tf.value === '05'));
        const second = !TAG.test(e.textContent ?? '');
        return first || second;
      });
    }
    // A8: ASCII text: full-string, non-empty membership in the derived 98-code-point class; surrogates never qualify.
    if (ASCII !== undefined) {
      const allAscii = (text: string) => {
        if (text.length === 0) return false;
        for (let i = 0; i < text.length; i++) {
          const unit = text.charCodeAt(i);
          if (unit >= 0xd800 && unit <= 0xdfff) return false;
          if (!classes.has(unit, ASCII)) return false;
        }
        return true;
      };
      registerByBody('A8', BODY.A8, (e) => {
        const tf = textformat(e);
        const first = !tf;
        const second = tf ? tf.value !== '07' : false;
        const third = allAscii(e.textContent ?? '');
        return first || second || third;
      });
    }
  }
  return { byRule, families };
}
