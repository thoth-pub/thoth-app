import { LOCALES } from '../../constants';
import { RESOURCES } from './i18n.types';

type Resources = {
  [key in keyof typeof LOCALES.enum]: {
    translation: {
      [key in keyof typeof RESOURCES.enum]: string;
    };
  };
};

export const resources: Resources = {
  [LOCALES.enum.en]: {
    translation: {
      [RESOURCES.enum['basic details']]: 'basic details',
      [RESOURCES.enum['add']]: 'add',
      [RESOURCES.enum['add new price']]: 'add new price',
      [RESOURCES.enum['add new affiliation']]: 'add new affiliation',
      [RESOURCES.enum['add new language']]: 'add new language',
      [RESOURCES.enum['add new location']]: 'add new location',
      [RESOURCES.enum['add translation']]: 'add translation',
      [RESOURCES.enum['add contributor']]: 'add contributor',
      [RESOURCES.enum['add publication']]: 'add publication',
      [RESOURCES.enum['book set']]: 'book set',
      [RESOURCES.enum['book chapter']]: 'book chapter',
      [RESOURCES.enum['edited book']]: 'edited book',
      [RESOURCES.enum['journal issue']]: 'journal issue',
      [RESOURCES.enum['monograph']]: 'monograph',
      [RESOURCES.enum['textbook']]: 'textbook',
      [RESOURCES.enum['afterword by']]: 'afterword by',
      [RESOURCES.enum['author']]: 'author',
      [RESOURCES.enum['contributions by']]: 'contributions by',
      [RESOURCES.enum['editor']]: 'editor',
      [RESOURCES.enum['foreword by']]: 'foreword by',
      [RESOURCES.enum['illustrator']]: 'illustrator',
      [RESOURCES.enum['indexer']]: 'indexer',
      [RESOURCES.enum['introduction by']]: 'introduction by',
      [RESOURCES.enum['music editor']]: 'music editor',
      [RESOURCES.enum['photographer']]: 'photographer',
      [RESOURCES.enum['preface by']]: 'preface by',
      [RESOURCES.enum['research by']]: 'research by',
      [RESOURCES.enum['software by']]: 'software by',
      [RESOURCES.enum['translator']]: 'translator',
      [RESOURCES.enum['original']]: 'original',
      [RESOURCES.enum['translated from']]: 'translated from',
      [RESOURCES.enum['translated to']]: 'translated to',
    },
  },
  [LOCALES.enum.es]: {
    translation: {
      [RESOURCES.enum['basic details']]: 'detalles básicos',
      [RESOURCES.enum['add']]: 'añadir',
      [RESOURCES.enum['add new price']]: 'añadir nuevo precio',
      [RESOURCES.enum['add new affiliation']]: 'añadir nueva afiliación',
      [RESOURCES.enum['add new language']]: 'añadir nuevo idioma',
      [RESOURCES.enum['add new location']]: 'añadir nueva ubicación',
      [RESOURCES.enum['add translation']]: 'añadir traducción',
      [RESOURCES.enum['add contributor']]: 'añadir colaborador',
      [RESOURCES.enum['add publication']]: 'añadir publicación',
      [RESOURCES.enum['book set']]: 'conjunto de libros',
      [RESOURCES.enum['book chapter']]: 'capítulo de libro',
      [RESOURCES.enum['edited book']]: 'libro editado',
      [RESOURCES.enum['journal issue']]: 'número de la revista',
      [RESOURCES.enum['monograph']]: 'monografía',
      [RESOURCES.enum['textbook']]: 'libro de texto',
      [RESOURCES.enum['afterword by']]: 'epílogo de',
      [RESOURCES.enum['author']]: 'autor',
      [RESOURCES.enum['contributions by']]: 'contribuciones de',
      [RESOURCES.enum['editor']]: 'editor',
      [RESOURCES.enum['foreword by']]: 'prólogo de',
      [RESOURCES.enum['illustrator']]: 'ilustrador',
      [RESOURCES.enum['indexer']]: 'indexador',
      [RESOURCES.enum['introduction by']]: 'introducción por',
      [RESOURCES.enum['music editor']]: 'editor de música',
      [RESOURCES.enum['photographer']]: 'fotógrafo',
      [RESOURCES.enum['preface by']]: 'prefacio de',
      [RESOURCES.enum['research by']]: 'investigación realizada por',
      [RESOURCES.enum['software by']]: 'software de',
      [RESOURCES.enum['translator']]: 'traductor',
      [RESOURCES.enum['original']]: 'original',
      [RESOURCES.enum['translated from']]: 'traducido de',
      [RESOURCES.enum['translated to']]: 'traducido a',
    },
  },
};
