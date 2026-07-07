import * as romans from 'roman-numerals';

export const convertRomanToArabic = (roman: string) => {
  let value = 0;

  try {
    value = romans.toArabic(roman);
  } catch (error) {
    console.error(error);
  }

  return value;
};

export const convertArabicToRoman = (arabic: number) => {
  let value = '';

  try {
    value = romans.toRoman(arabic);
  } catch (error) {
    console.error(error);
  }

  return value;
};
