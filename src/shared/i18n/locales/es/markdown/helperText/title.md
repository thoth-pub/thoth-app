# Título

Esta sección gestiona el **Título** (obligatorio), el **Subtítulo** y la **Edición** de la obra. El **Título** ya habrá sido proporcionado durante el proceso de configuración inicial.

El modo de edición permite modificar los siguientes campos:

- **Título**: campo de texto para introducir el título de la obra.
- **Subtítulo**: campo de texto para introducir el subtítulo de la obra, habitualmente separado del Título por dos puntos.
- **Edición**: campo numérico entero para introducir el número de edición de la obra. El número de edición predeterminado es «1», aunque se admite cualquier número entero.

> «Una edición de una obra determinada suele englobar todos los ejemplares de esa obra que contienen el mismo contenido y que, en la mayoría de los casos, han sido producidos por el mismo editor. La identificación de una edición específica o diferenciada por parte del editor puede deberse a cambios en el contenido (adición, revisión o eliminación de contenido) o puede identificar productos elaborados para un mercado específico. Es importante señalar que algunas ediciones, como las segundas ediciones, las ediciones abreviadas o las ediciones anotadas, pueden constituir obras completamente nuevas; otras pueden contener el mismo contenido pero clasificarse como una edición diferente, como la edición en letra grande» (BISG, *Revised Best Practices for Book Metadata,* 93).

## XML JATS

Tanto el **Título** como el **Subtítulo** admiten formato en XML JATS para negrita, cursiva, tachado y subrayado.

- [negrita](https://jats.nlm.nih.gov/archiving/tag-library/1.4/element/bold.html): `<bold>texto</bold>`
- [cursiva](https://jats.nlm.nih.gov/archiving/tag-library/1.4/element/italic.html): `<italic>texto</italic>`
- [tachado](https://jats.nlm.nih.gov/archiving/tag-library/1.4/element/strike.html): `<strike>texto</strike>`
- [subrayado](https://jats.nlm.nih.gov/archiving/tag-library/1.4/element/underline.html): `<underline>texto</underline>`

## Opciones multilingües

El menú desplegable **Idioma** permite establecer el idioma del **Título** y el **Subtítulo**. La lista de idiomas y variantes lingüísticas admitidas combina un código de idioma de dos letras según la norma [ISO 639-1](https://www.loc.gov/standards/iso639-2/php/code_list.php) seguido de un código de país de dos letras según la norma [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/List_of_ISO_3166_country_codes).

El botón **Agregar nueva traducción** permite añadir una traducción del **Título** y el **Subtítulo** en otro idioma.
