/**
 * Character classes of the accelerated regex literals, derived exhaustively
 * (every code point 0..0x10FFFF) from xspattern 3.1.0, the XSD regex engine
 * fontoxpath evaluates `matches()` with (SPIKE-03 `regex_classes_v2.json`,
 * derived 2026-09-09; accepted evidence pin in thoth-app#196). They are the
 * engine's own semantics, never JavaScript's: XSD `\s` is exactly
 * `#x20 | #x9 | #xA | #xD`, so U+00A0 or U+2028 are non-whitespace here, and
 * `\p{IsBlock}` classes are XSD block ranges. Each entry lists the inclusive
 * code-point ranges the class matches. `characterClasses.test.ts` pins the
 * table's digest and re-checks every range boundary against fontoxpath.
 */
export interface DerivedCharacterClass {
  readonly pattern: string;
  readonly ranges: readonly (readonly [number, number])[];
}

export const DERIVED_CHARACTER_CLASSES: readonly DerivedCharacterClass[] = [
  {
    pattern:
      '(\\p{IsLatin-1Supplement}|\\p{IsLatinExtended-A}|\\p{IsLatinExtended-B}|\\p{IsLatinExtended-C}|\\p{IsLatinExtended-D}|\\p{IsLatinExtendedAdditional}|[ꬰ-꭯])',
    ranges: [
      [128, 591],
      [7680, 7935],
      [11360, 11391],
      [42784, 43007],
      [43824, 43887],
    ],
  },
  {
    pattern: '(\\p{IsCyrillic}|\\p{IsCyrillicSupplement}|\\p{IsCyrillicExtended-A}|\\p{IsCyrillicExtended-B}|[ᲀ-᲏])',
    ranges: [
      [1024, 1327],
      [7296, 7311],
      [11744, 11775],
      [42560, 42655],
    ],
  },
  {
    pattern:
      '(\\p{IsArabic}|\\p{IsArabicSupplement}|[ࢠ-ࣿ]|\\p{IsArabicPresentationForms-A}|\\p{IsArabicPresentationForms-B})',
    ranges: [
      [1536, 1791],
      [1872, 1919],
      [2208, 2303],
      [64336, 65023],
      [65136, 65279],
    ],
  },
  {
    pattern: '\\p{IsHebrew}',
    ranges: [[1424, 1535]],
  },
  {
    pattern: '(\\p{IsHangulSyllables}|\\p{IsHangulJamo}|\\p{IsHangulJamoExtended-A}|\\p{IsHangulJamoExtended-B})',
    ranges: [
      [4352, 4607],
      [43360, 43391],
      [44032, 55295],
    ],
  },
  {
    pattern:
      '(\\p{IsCJKUnifiedIdeographs}|\\p{IsCJKUnifiedIdeographsExtensionA}|\\p{IsCJKUnifiedIdeographsExtensionB}|\\p{IsCJKUnifiedIdeographsExtensionC}|\\p{IsCJKUnifiedIdeographsExtensionD}|[𫠠-𬺯]|[𬺰-𮯯])',
    ranges: [
      [13312, 19903],
      [19968, 40959],
      [131072, 173791],
      [173824, 191471],
    ],
  },
  {
    pattern: '(\\p{IsHiragana}|\\p{IsKatakana}|\\p{IsKatakanaPhoneticExtensions})',
    ranges: [
      [12352, 12543],
      [12784, 12799],
    ],
  },
  {
    pattern: '(\\p{IsGreekandCoptic}|\\p{IsGreekExtended})',
    ranges: [
      [880, 1023],
      [7936, 8191],
    ],
  },
  {
    pattern:
      '(\\p{IsDevanagari}|\\p{IsBengali}|[਀-੿]|\\p{IsGujarati}|\\p{IsOriya}|\\p{IsTamil}|\\p{IsTelugu}|\\p{IsKannada}|\\p{IsMalayalam}|\\p{IsSinhala})',
    ranges: [[2304, 3583]],
  },
  {
    pattern: '(\\p{IsCombiningDiacriticalMarks}|\\p{IsCombiningDiacriticalMarksSupplement}|[᪰-᫿])',
    ranges: [
      [768, 879],
      [6832, 6911],
      [7616, 7679],
    ],
  },
  {
    pattern: '\\S',
    ranges: [
      [0, 8],
      [11, 12],
      [14, 31],
      [33, 55295],
      [57344, 1114111],
    ],
  },
  {
    pattern:
      '(\\p{IsHangulSyllables}|\\p{IsHangulJamo}|\\p{IsHangulJamoExtended-A}|\\p{IsHangulJamoExtended-B}|\\p{IsHangulCompatibilityJamo})',
    ranges: [
      [4352, 4607],
      [12592, 12687],
      [43360, 43391],
      [44032, 55295],
    ],
  },
  {
    pattern:
      '(\\p{IsHiragana}|\\p{IsKatakana}|\\p{IsKatakanaPhoneticExtensions}|\\p{IsKanaSupplement}|[𘄀-𘄯]|[𘄰-𘅯])',
    ranges: [
      [12352, 12543],
      [12784, 12799],
      [98560, 98671],
      [110592, 110847],
    ],
  },
  {
    pattern:
      '(\\p{IsDevanagari}|\\p{IsDevanagariExtended}|\\p{IsVedicExtensions}|\\p{IsBengali}|[਀-੿]|\\p{IsGujarati}|\\p{IsOriya}|\\p{IsTamil}|\\p{IsTelugu}|\\p{IsKannada}|\\p{IsMalayalam}|\\p{IsSinhala})',
    ranges: [
      [2304, 3583],
      [7376, 7423],
      [43232, 43263],
    ],
  },
  {
    pattern: '[A-Za-z]',
    ranges: [
      [65, 90],
      [97, 122],
    ],
  },
  {
    pattern: '[^(>|&gt;)]',
    ranges: [
      [0, 37],
      [39, 39],
      [42, 58],
      [60, 61],
      [63, 102],
      [104, 115],
      [117, 123],
      [125, 55295],
      [57344, 1114111],
    ],
  },
  {
    pattern: '[^>]',
    ranges: [
      [0, 61],
      [63, 55295],
      [57344, 1114111],
    ],
  },
  {
    pattern: '(\\n|\\r|\\t|[ -~])',
    ranges: [
      [9, 10],
      [13, 13],
      [32, 126],
    ],
  },
];

/** Bitmask membership of code points across the derived classes, with early exit once every wanted class is found. */
export interface CharacterClassSet {
  /** The bit of a class by its exact pattern text, or `undefined` when the pattern is not derived. */
  bit(pattern: string): number | undefined;
  /**
   * Scans `text` and returns `found` extended by the bit of every wanted
   * class that contains at least one character of the text. Surrogate pairs
   * are decoded to their code point; a lone surrogate is a code point of its
   * own (never a member of any derived class).
   */
  scan(text: string, want: number, found?: number): number;
  /** Whether one code point belongs to the class of `bit`. */
  has(codePoint: number, bit: number): boolean;
  /** The inclusive code-point ranges of a class by its exact pattern text. */
  ranges(pattern: string): readonly (readonly [number, number])[] | undefined;
}

export function createCharacterClassSet(
  classes: readonly DerivedCharacterClass[] = DERIVED_CHARACTER_CLASSES,
): CharacterClassSet {
  if (classes.length > 31) throw new Error('at most 31 derived classes fit one bitmask');
  const bmp = new Uint32Array(0x10000);
  const astral: [number, number][][] = classes.map(() => []);
  const bits = new Map<string, number>();
  classes.forEach((klass, i) => {
    const bit = 1 << i;
    bits.set(klass.pattern, bit);
    for (const [lo, hi] of klass.ranges) {
      for (let cp = lo; cp <= Math.min(hi, 0xffff); cp++) bmp[cp] |= bit;
      if (hi > 0xffff) astral[i].push([Math.max(lo, 0x10000), hi]);
    }
  });
  const astralHas = (i: number, cp: number) => {
    for (const [lo, hi] of astral[i]) {
      if (cp < lo) return false;
      if (cp <= hi) return true;
    }
    return false;
  };
  const astralMask = (cp: number, want: number) => {
    let mask = 0;
    for (let i = 0, rem = want; rem; i++, rem >>>= 1) if (rem & 1 && astralHas(i, cp)) mask |= 1 << i;
    return mask;
  };
  const byPattern = new Map(classes.map((klass) => [klass.pattern, klass.ranges]));
  return {
    bit: (pattern) => bits.get(pattern),
    ranges: (pattern) => byPattern.get(pattern),
    has: (cp, bit) => (cp <= 0xffff ? (bmp[cp] & bit) !== 0 : astralMask(cp, bit) !== 0),
    scan(text, want, found = 0) {
      const n = text.length;
      for (let i = 0; i < n && (found & want) !== want; i++) {
        const unit = text.charCodeAt(i);
        if (unit >= 0xd800 && unit <= 0xdbff && i + 1 < n) {
          const low = text.charCodeAt(i + 1);
          if (low >= 0xdc00 && low <= 0xdfff) {
            i++;
            found |= astralMask(0x10000 + ((unit - 0xd800) << 10) + (low - 0xdc00), want & ~found);
            continue;
          }
        }
        found |= bmp[unit] & want;
      }
      return found;
    },
  };
}
