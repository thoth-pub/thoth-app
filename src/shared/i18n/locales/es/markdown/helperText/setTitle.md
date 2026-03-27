# Título

Esta sección gestiona el **Título** de un Conjunto de libros. Un Conjunto de libros es una secuencia cerrada de volúmenes publicados conjuntamente como una única obra.

El modo de edición permite modificar los siguientes campos:

- **Título**: campo de texto para introducir el título del conjunto de libros.
- **Subtítulo**: campo de texto para introducir el subtítulo del conjunto de libros, habitualmente separado del Título por dos puntos.

## XML JATS

Tanto el **Título** como el **Subtítulo** admiten formato en XML JATS para negrita, cursiva, tachado y subrayado.

- [negrita](https://jats.nlm.nih.gov/archiving/tag-library/1.4/element/bold.html): `<bold>texto</bold>`
- [cursiva](https://jats.nlm.nih.gov/archiving/tag-library/1.4/element/italic.html): `<italic>texto</italic>`
- [tachado](https://jats.nlm.nih.gov/archiving/tag-library/1.4/element/strike.html): `<strike>texto</strike>`
- [subrayado](https://jats.nlm.nih.gov/archiving/tag-library/1.4/element/underline.html): `<underline>texto</underline>`

## Opciones multilingües

El menú desplegable **Idioma** permite establecer el idioma del **Título** y el **Subtítulo**. La lista de idiomas y variantes lingüísticas admitidas combina un código de idioma de dos letras según la norma [ISO 639-1](https://www.loc.gov/standards/iso639-2/php/code_list.php) seguido de un código de país de dos letras según la norma [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/List_of_ISO_3166_country_codes). El valor predeterminado puede configurarse en Editor > Sellos > Idioma predeterminado.

El botón **Agregar nueva traducción** permite añadir una traducción del **Título** y el **Subtítulo** en otro idioma.
