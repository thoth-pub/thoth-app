import { evaluateXPath, parseScript } from 'fontoxpath';
import { Document, type Element } from 'slimdom';

import { modelElement, type SchemaModel } from '../schemaModel';
import { DECIMAL_NAMESPACE } from './decimal';

/**
 * Mechanical XQueryX rewrites that pin the canonical strict semantics
 * (SPIKE-02 v4 `canonical.mjs`, reproduced rule for rule, no per-rule
 * transcription):
 * (2) strict and/or: both operands are always evaluated, so a raising operand
 *     is never short-circuited away (Xerces2-J 2.12.2 / PsychoPath);
 * (3) schema-typed atomisation: decimal/integer/list-typed paths are atomised
 *     by their ordinary-XSD simple type at atomisation points;
 *     exact decimal: decimal-typed arithmetic and comparisons go through the
 *     BigInt functions of `decimal.ts`.
 */
const XS = 'http://www.w3.org/2001/XMLSchema';
const XQX = 'http://www.w3.org/2005/XQueryX';
const FN = 'http://www.w3.org/2005/xpath-functions';

const astDocument = new Document();

const kids = (n: Element): Element[] => Array.from(n.childNodes).filter((c): c is Element => c.nodeType === 1);
const ln = (n: Element) => n.localName;
const firstKid = (n: Element | undefined): Element | undefined => (n ? kids(n)[0] : undefined);
const kidNamed = (n: Element, name: string) => kids(n).find((k) => ln(k) === name);

function el(name: string): Element {
  return astDocument.createElementNS(XQX, 'xqx:' + name);
}
function wrap(name: string, child: Element): Element {
  const e = el(name);
  e.appendChild(child);
  return e;
}
function fnCall(name: string, args: Element[], uri = FN): Element {
  const f = el('functionCallExpr');
  const fnName = el('functionName');
  fnName.setAttributeNS(XQX, 'xqx:prefix', '');
  fnName.setAttributeNS(XQX, 'xqx:URI', uri);
  fnName.textContent = name;
  f.appendChild(fnName);
  const a = el('arguments');
  for (const x of args) a.appendChild(x);
  f.appendChild(a);
  return f;
}
function varRef(name: string): Element {
  const v = el('varRef');
  const n = el('name');
  n.textContent = name;
  v.appendChild(n);
  return v;
}
function intLit(value: number): Element {
  const e = el('integerConstantExpr');
  const v = el('value');
  v.textContent = String(value);
  e.appendChild(v);
  return e;
}
function strLit(s: string): Element {
  const e = el('stringConstantExpr');
  const v = el('value');
  v.textContent = s;
  e.appendChild(v);
  return e;
}
function seq(items: Element[]): Element {
  const s = el('sequenceExpr');
  for (const i of items) s.appendChild(i);
  return s;
}
function letExpr(name: string, bound: Element, ret: Element): Element {
  const f = el('flworExpr');
  const lc = el('letClause');
  const li = el('letClauseItem');
  const tvb = el('typedVariableBinding');
  const nm = el('varName');
  nm.textContent = name;
  tvb.appendChild(nm);
  li.appendChild(tvb);
  const le = el('letExpr');
  le.appendChild(bound);
  li.appendChild(le);
  lc.appendChild(li);
  f.appendChild(lc);
  const rc = el('returnClause');
  rc.appendChild(ret);
  f.appendChild(rc);
  return f;
}
function binOp(name: string, a: Element, b: Element): Element {
  const o = el(name);
  o.appendChild(wrap('firstOperand', a));
  o.appendChild(wrap('secondOperand', b));
  return o;
}
function predicateIndex(expr: Element, index: number): Element {
  const p = el('pathExpr');
  const st = el('stepExpr');
  st.appendChild(wrap('filterExpr', expr));
  const pr = el('predicates');
  pr.appendChild(intLit(index));
  st.appendChild(pr);
  p.appendChild(st);
  return p;
}

let counter = 0;

/** A and B => let $s := (boolean(A), boolean(B)) return (count($s) eq 2 and $s[1] and $s[2]) */
export function rewriteStrictAndOr(node: Element): void {
  for (const c of kids(node)) rewriteStrictAndOr(c);
  const t = ln(node);
  if (t === 'andOp' || t === 'orOp') {
    const a = firstKid(kids(node)[0])!;
    const b = firstKid(kids(node)[1])!;
    const v = 'thoth_s' + counter++;
    const bound = seq([fnCall('boolean', [a]), fnCall('boolean', [b])]);
    const guard = binOp('eqOp', fnCall('count', [varRef(v)]), intLit(2));
    const combined = binOp(t, predicateIndex(varRef(v), 1), predicateIndex(varRef(v), 2));
    node.parentNode!.replaceChild(letExpr(v, bound, binOp('andOp', guard, combined)), node);
  }
}

const NUMERIC = new Set(['decimal', 'integer', 'positiveInteger', 'nonNegativeInteger', 'int', 'long', 'short']);
const ATOMIC_ARG_FN = new Set([
  'matches',
  'replace',
  'tokenize',
  'string-length',
  'normalize-space',
  'substring',
  'contains',
  'starts-with',
  'ends-with',
  'upper-case',
  'lower-case',
  'translate',
  'distinct-values',
  'string-join',
  'sum',
  'min',
  'max',
  'avg',
  'number',
  'concat',
  'substring-before',
  'substring-after',
  'abs',
  'round',
  'floor',
  'ceiling',
  'compare',
  'index-of',
  'data',
]);
const CMP = new Set([
  'equalOp',
  'notEqualOp',
  'lessThanOp',
  'lessThanOrEqualOp',
  'greaterThanOp',
  'greaterThanOrEqualOp',
  'eqOp',
  'neOp',
  'ltOp',
  'leOp',
  'gtOp',
  'geOp',
]);
const ARITH = new Set(['addOp', 'subtractOp', 'multiplyOp', 'divOp', 'idivOp', 'modOp', 'unaryMinusOp', 'unaryPlusOp']);

type TypeInfo = { kind: 'unknown' | 'complex' | 'string' } | { kind: 'list' } | { kind: 'numeric'; prim: string };
type Vars = Record<string, { names: string[] }>;

function typeInfoOf(model: SchemaModel, name: string): TypeInfo {
  const e = modelElement(model, name);
  if (!e) return { kind: 'unknown' };
  if (!e.simple) return { kind: 'complex' };
  if (e.simple.variety === 'list') return { kind: 'list' };
  if (NUMERIC.has(e.simple.primitive)) return { kind: 'numeric', prim: e.simple.primitive };
  return { kind: 'string' };
}
function childNames(model: SchemaModel, ctxNames: string[], nameTest: string | null): string[] {
  const out = new Set<string>();
  for (const c of ctxNames) {
    const e = modelElement(model, c);
    if (!e || !e.children) continue;
    for (const ch of e.children) if (nameTest == null || ch === nameTest) out.add(ch);
  }
  return [...out];
}
function unionNames(model: SchemaModel, ctxNames: string[], node: Element, vars: Vars): string[] {
  const out = new Set<string>();
  for (const side of kids(node)) {
    const op = firstKid(side);
    if (!op) continue;
    const names =
      ln(op) === 'unionOp'
        ? unionNames(model, ctxNames, op, vars)
        : ln(op) === 'pathExpr'
          ? pathTypes(model, ctxNames, op, vars)
          : ['<expr>'];
    names.forEach((x) => out.add(x));
  }
  return [...out];
}
function unwrapSequence(fe: Element): Element | undefined {
  let inner = firstKid(fe);
  while (inner && ln(inner) === 'sequenceExpr' && kids(inner).length === 1) inner = kids(inner)[0];
  return inner;
}
function pathTypes(model: SchemaModel, ctxNames: string[], pathNode: Element, vars: Vars): string[] {
  let names = ctxNames;
  for (const st of kids(pathNode).filter((k) => ln(k) === 'stepExpr')) {
    const fe = kidNamed(st, 'filterExpr');
    if (fe) {
      const inner = unwrapSequence(fe);
      if (inner && ln(inner) === 'varRef') {
        const vn = kids(inner)[0].textContent ?? '';
        names = vars[vn]?.names ?? ['<unknown>'];
      } else if (inner && ln(inner) === 'contextItemExpr') names = ctxNames;
      else if (inner && ln(inner) === 'unionOp') names = unionNames(model, ctxNames, inner, vars);
      else if (inner && ln(inner) === 'pathExpr') names = pathTypes(model, ctxNames, inner, vars);
      else names = ['<expr>'];
      continue;
    }
    const axis = kidNamed(st, 'xpathAxis')?.textContent || 'child';
    const nt = kidNamed(st, 'nameTest')?.textContent ?? null;
    if (axis === 'attribute') {
      names = ['<attr>'];
      continue;
    }
    names = axis === 'child' ? childNames(model, names, nt) : ['<' + axis + '>'];
  }
  return names;
}
function castExpr(kind: 'numeric' | 'list', prim: string | undefined, pathNode: Element): Element {
  // (for $n in P return xs:decimal(string($n)))  /  list tokeniser
  const v = 'thoth_n' + counter++;
  const f = el('flworExpr');
  const fc = el('forClause');
  const fi = el('forClauseItem');
  const tvb = el('typedVariableBinding');
  const nm = el('varName');
  nm.textContent = v;
  tvb.appendChild(nm);
  fi.appendChild(tvb);
  const fe = el('forExpr');
  fe.appendChild(pathNode);
  fi.appendChild(fe);
  fc.appendChild(fi);
  f.appendChild(fc);
  let ret: Element;
  if (kind === 'numeric') {
    ret = fnCall(prim === 'decimal' ? 'decimal' : 'integer', [fnCall('string', [varRef(v)])], XS);
  } else {
    const v2 = 'thoth_t' + counter++;
    const f2 = el('flworExpr');
    const fc2 = el('forClause');
    const fi2 = el('forClauseItem');
    const tvb2 = el('typedVariableBinding');
    const nm2 = el('varName');
    nm2.textContent = v2;
    tvb2.appendChild(nm2);
    fi2.appendChild(tvb2);
    const fe2 = el('forExpr');
    fe2.appendChild(fnCall('tokenize', [fnCall('normalize-space', [fnCall('string', [varRef(v)])]), strLit(' ')]));
    fi2.appendChild(fe2);
    fc2.appendChild(fi2);
    f2.appendChild(fc2);
    const rc2 = el('returnClause');
    rc2.appendChild(fnCall('string', [varRef(v2)], XS));
    f2.appendChild(rc2);
    ret = f2;
  }
  const rc = el('returnClause');
  rc.appendChild(ret);
  f.appendChild(rc);
  return f;
}

export function rewriteTyped(node: Element, model: SchemaModel, ctxNames: string[], vars: Vars = {}): void {
  const t = ln(node);
  if (t === 'quantifiedExpr') {
    let scope = vars;
    for (const c of kids(node).filter((k) => ln(k) === 'quantifiedExprInClause')) {
      const vn = kids(kidNamed(c, 'typedVariableBinding')!)[0].textContent ?? '';
      const src = firstKid(kidNamed(c, 'sourceExpr'))!;
      rewriteTyped(src, model, ctxNames, scope);
      scope = {
        ...scope,
        [vn]: { names: ln(src) === 'pathExpr' ? pathTypes(model, ctxNames, src, scope) : ['<expr>'] },
      };
    }
    rewriteTyped(firstKid(kidNamed(node, 'predicateExpr'))!, model, ctxNames, scope);
    return;
  }
  if (t === 'flworExpr') {
    let scope = vars;
    for (const cl of kids(node)) {
      if (ln(cl) === 'forClause' || ln(cl) === 'letClause') {
        for (const ce of kids(cl)) {
          const vb = kidNamed(ce, 'typedVariableBinding');
          const vn = vb ? (kids(vb)[0].textContent ?? '') : null;
          const ex = kids(ce).find((k) => ln(k) === 'forExpr' || ln(k) === 'letExpr');
          if (ex) {
            const inner = kids(ex)[0];
            rewriteTyped(inner, model, ctxNames, scope);
            if (vn) {
              scope = {
                ...scope,
                [vn]: { names: ln(inner) === 'pathExpr' ? pathTypes(model, ctxNames, inner, scope) : ['<expr>'] },
              };
            }
          }
        }
      } else {
        for (const c of kids(cl)) rewriteTyped(c, model, ctxNames, scope);
      }
    }
    return;
  }
  if (t === 'pathExpr') {
    // predicates inside steps evaluate with the step's names as context
    let names = ctxNames;
    for (const st of kids(node).filter((k) => ln(k) === 'stepExpr')) {
      const fe = kidNamed(st, 'filterExpr');
      if (fe) {
        const inner = unwrapSequence(fe);
        const current = names;
        if (inner && ln(inner) === 'varRef') names = vars[kids(inner)[0].textContent ?? '']?.names ?? ['<unknown>'];
        else if (inner && ln(inner) === 'contextItemExpr') names = current;
        else if (inner && (ln(inner) === 'unionOp' || ln(inner) === 'pathExpr')) {
          rewriteTyped(inner, model, current, vars);
          names =
            ln(inner) === 'unionOp' ? unionNames(model, current, inner, vars) : pathTypes(model, current, inner, vars);
        } else {
          if (inner) rewriteTyped(inner, model, current, vars);
          names = ['<expr>'];
        }
      } else {
        const axis = kidNamed(st, 'xpathAxis')?.textContent || 'child';
        const nt = kidNamed(st, 'nameTest')?.textContent ?? null;
        names =
          axis === 'child' ? childNames(model, names, nt) : axis === 'attribute' ? ['<attr>'] : ['<' + axis + '>'];
      }
      const predicates = kidNamed(st, 'predicates');
      if (predicates) for (const p of kids(predicates)) rewriteTyped(p, model, names, vars);
    }
    return;
  }
  // inner atomisation points first, then this node
  for (const c of kids(node)) rewriteTyped(c, model, ctxNames, vars);
  const atomize = (operand: Element) => {
    let names: string[] | null = null;
    if (ln(operand) === 'pathExpr') names = pathTypes(model, ctxNames, operand, vars);
    else if (ln(operand) === 'unionOp') names = unionNames(model, ctxNames, operand, vars);
    else if (ln(operand) === 'varRef') names = vars[kids(operand)[0].textContent ?? '']?.names ?? null;
    else if (ln(operand) === 'contextItemExpr') names = ctxNames;
    if (!names) return;
    const kinds = names.map((n) => typeInfoOf(model, n));
    const k = kinds.find((x) => x.kind === 'numeric' || x.kind === 'list');
    if (!k || (k.kind !== 'numeric' && k.kind !== 'list')) return;
    if (kinds.some((x) => x.kind !== k.kind)) return; // mixed => leave
    const replacement = castExpr(k.kind, k.kind === 'numeric' ? k.prim : undefined, operand.cloneNode(true) as Element);
    operand.parentNode!.replaceChild(replacement, operand);
  };
  if (CMP.has(t) || ARITH.has(t)) {
    for (const side of kids(node)) {
      const op = firstKid(side);
      if (op) atomize(op);
    }
  } else if (t === 'functionCallExpr') {
    const fn = kidNamed(node, 'functionName')!;
    const prefix = fn.getAttributeNS(XQX, 'prefix');
    if (ATOMIC_ARG_FN.has(fn.textContent ?? '') && !prefix) {
      const args = kidNamed(node, 'arguments');
      if (args) for (const a of kids(args)) atomize(a);
    }
  }
}

// ---------- exact decimal rewrite ----------
type NumType = 'decimal' | 'double' | 'integer' | 'string' | 'boolean' | 'unknown';
const decFn = (name: string, args: Element[]) => fnCall(name, args, DECIMAL_NAMESPACE);
const fnNameOf = (n: Element) => kidNamed(n, 'functionName');

function isDecimalCastFlwor(n: Element): boolean {
  if (ln(n) !== 'flworExpr') return false;
  const rc = kidNamed(n, 'returnClause');
  const f = rc && kids(rc)[0];
  if (!f || ln(f) !== 'functionCallExpr') return false;
  const fn = fnNameOf(f);
  return !!fn && fn.textContent === 'decimal' && fn.getAttributeNS(XQX, 'URI') === XS;
}
function numType(n: Element): NumType {
  const t = ln(n);
  if (t === 'sequenceExpr') {
    const c = kids(n);
    return c.length === 1 ? numType(c[0]) : 'unknown';
  }
  if (t === 'pathExpr') {
    const steps = kids(n).filter((k) => ln(k) === 'stepExpr');
    const last = steps[steps.length - 1];
    const fe = last && kidNamed(last, 'filterExpr');
    const inner = fe && kids(fe)[0];
    if (inner) {
      const it = numType(inner);
      if (it === 'decimal' || it === 'double' || it === 'integer') return it;
    }
    return 'unknown';
  }
  if (t === 'decimalConstantExpr') return 'decimal';
  if (t === 'integerConstantExpr') return 'integer';
  if (t === 'doubleConstantExpr') return 'double';
  if (t === 'stringConstantExpr') return 'string';
  if (isDecimalCastFlwor(n)) return 'decimal';
  if (t === 'functionCallExpr') {
    const fn = fnNameOf(n)!;
    const name = fn.textContent ?? '';
    const uri = fn.getAttributeNS(XQX, 'URI');
    if (uri === DECIMAL_NAMESPACE) {
      if (name === 'todouble') return 'double';
      return ['eq', 'ne', 'lt', 'le', 'gt', 'ge', 'geq', 'gne', 'glt', 'gle', 'ggt', 'gge'].includes(name)
        ? 'boolean'
        : 'decimal';
    }
    if (uri === XS && name === 'decimal') return 'decimal';
    if (uri === XS && name === 'integer') return 'integer';
    if (uri === XS && name === 'double') return 'double';
    if (name === 'number') return 'double';
    if (name === 'count' || name === 'string-length') return 'integer';
    if (name === 'abs' || name === 'sum' || name === 'min' || name === 'max') {
      const args = kids(kidNamed(n, 'arguments') ?? n);
      return args[0] ? numType(args[0]) : 'unknown';
    }
    return 'unknown';
  }
  if (ARITH.has(t)) {
    const ops = kids(n).map((s) => numType(kids(s)[0]));
    if (ops.includes('double')) return 'double';
    if (ops.every((o) => o === 'decimal' || o === 'integer')) return ops.includes('decimal') ? 'decimal' : 'integer';
    return 'unknown';
  }
  return 'unknown';
}
/** Converts a decimal-typed operand into a decimal-string-valued node. */
function toDecStr(n: Element): Element | null {
  const t = ln(n);
  if (t === 'decimalConstantExpr' || t === 'integerConstantExpr') return strLit(kids(n)[0].textContent ?? '');
  if (t === 'pathExpr' && numType(n) === 'decimal') return n.cloneNode(true) as Element;
  if (t === 'sequenceExpr' && kids(n).length === 1) {
    const inner = toDecStr(kids(n)[0]);
    if (!inner) return null;
    const sq = el('sequenceExpr');
    sq.appendChild(inner);
    return sq;
  }
  if (isDecimalCastFlwor(n)) {
    // rewrite the return clause xs:decimal(string($v)) -> string($v)
    const c = n.cloneNode(true) as Element;
    const rc = kidNamed(c, 'returnClause')!;
    const f = kids(rc)[0];
    const inner = kids(kidNamed(f, 'arguments')!)[0];
    rc.replaceChild(inner, f);
    return c;
  }
  if (t === 'functionCallExpr') {
    const fn = fnNameOf(n)!;
    if (fn.getAttributeNS(XQX, 'URI') === DECIMAL_NAMESPACE) {
      return fn.textContent === 'todouble' ? null : (n.cloneNode(true) as Element);
    }
    const name = fn.textContent ?? '';
    const args = kids(kidNamed(n, 'arguments')!);
    const decimalArg = (a: Element) => toDecStr(a) as Element;
    if (name === 'abs' && args.length === 1) return decFn('abs', [decimalArg(args[0])]);
    if ((name === 'sum' || name === 'min' || name === 'max') && args.length === 1) {
      return decFn(name, [decimalArg(args[0])]);
    }
    if (fn.getAttributeNS(XQX, 'URI') === XS && (name === 'decimal' || name === 'integer')) {
      return fnCall('string', [n.cloneNode(true) as Element]);
    }
  }
  if (ARITH.has(t)) {
    const [a, b] = kids(n).map((s) => kids(s)[0]);
    const method = ({ addOp: 'add', subtractOp: 'sub', multiplyOp: 'mul', divOp: 'div' } as Record<string, string>)[t];
    if (method) return decFn(method, [toDecStr(a) as Element, toDecStr(b) as Element]);
  }
  if (t === 'unaryMinusOp') return decFn('neg', [toDecStr(kids(kids(n)[0])[0]) as Element]);
  return null;
}
const isDecimalString = (x: Element) => {
  if (ln(x) !== 'functionCallExpr') return false;
  const fn = fnNameOf(x)!;
  return fn.getAttributeNS(XQX, 'URI') === DECIMAL_NAMESPACE && fn.textContent !== 'todouble';
};
const COMPARISON_FN: Record<string, string> = {
  eqOp: 'eq',
  neOp: 'ne',
  ltOp: 'lt',
  leOp: 'le',
  gtOp: 'gt',
  geOp: 'ge',
  equalOp: 'geq',
  notEqualOp: 'gne',
  lessThanOp: 'glt',
  lessThanOrEqualOp: 'gle',
  greaterThanOp: 'ggt',
  greaterThanOrEqualOp: 'gge',
};
const ARITHMETIC_FN: Record<string, string> = { addOp: 'add', subtractOp: 'sub', multiplyOp: 'mul', divOp: 'div' };

export function rewriteExactDecimal(node: Element): void {
  for (const c of kids(node)) rewriteExactDecimal(c);
  const t = ln(node);
  if (ARITH.has(t) || CMP.has(t)) {
    const sides = kids(node).map((s) => kids(s)[0]);
    if (sides.length !== 2 || !sides[0] || !sides[1]) return;
    const [ta, tb] = sides.map(numType);
    const decimalContext =
      (ta === 'decimal' && (tb === 'decimal' || tb === 'integer')) ||
      (tb === 'decimal' && (ta === 'decimal' || ta === 'integer'));
    if (!decimalContext) {
      // XPath numeric promotion: decimal op double -> double
      if ((ta === 'double' && isDecimalString(sides[1])) || (tb === 'double' && isDecimalString(sides[0]))) {
        const i = ta === 'double' ? 1 : 0;
        sides[i].parentNode!.replaceChild(decFn('todouble', [sides[i].cloneNode(true) as Element]), sides[i]);
      }
      return;
    }
    const a = toDecStr(sides[0]);
    const b = toDecStr(sides[1]);
    if (!a || !b) return;
    const name = ARITH.has(t) ? ARITHMETIC_FN[t] : COMPARISON_FN[t];
    if (name) node.parentNode!.replaceChild(decFn(name, [a, b]), node);
  } else if (t === 'functionCallExpr') {
    const fn = fnNameOf(node)!;
    const args = kids(kidNamed(node, 'arguments') ?? node);
    // number(decimal-string-expr) -> thoth:todouble
    if (
      fn.textContent === 'number' &&
      args.length === 1 &&
      numType(args[0]) === 'decimal' &&
      !fn.getAttributeNS(XQX, 'prefix')
    ) {
      const a = toDecStr(args[0]);
      if (a) node.parentNode!.replaceChild(decFn('todouble', [a]), node);
    }
  }
}

export interface CompileOptions {
  readonly strictAndOr: boolean;
  readonly typed: boolean;
  readonly model: SchemaModel;
  readonly owner: string;
}

/** Parses an XPath 3.1 body to XQueryX and applies the pinned rewrites. */
export function compileRule(body: string, options: CompileOptions): Element {
  const ast = parseScript(
    body,
    { language: evaluateXPath.XPATH_3_1_LANGUAGE },
    astDocument as unknown as Parameters<typeof parseScript>[2],
  ) as unknown as Element;
  let queryBody: Element | undefined = ast;
  for (const part of ['mainModule', 'queryBody']) queryBody = queryBody && kidNamed(queryBody, part);
  const root = firstKid(queryBody);
  if (!root) throw new Error('empty XPath body');
  // Exactly as the reference: every rewrite receives the ORIGINAL root node,
  // even when an earlier rewrite has replaced it in the tree.
  if (options.typed) {
    rewriteTyped(root, options.model, [options.owner]);
    rewriteExactDecimal(root);
  }
  if (options.strictAndOr) rewriteStrictAndOr(root);
  return ast;
}
