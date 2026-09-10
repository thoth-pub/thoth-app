# Intervalo de páginas

Esta sección gestiona el **Número total de páginas**, así como la **Primera página** y la **Última página**.

El modo de edición permite modificar los siguientes campos:

- **Número total de páginas**: campo numérico entero para introducir el número total de páginas del capítulo.
- **Primera página**: campo de texto para introducir la primera página del capítulo.
- **Última página**: campo de texto para introducir la última página del capítulo.

La primera y la última página admiten tres convenciones de numeración:

- **Números**, por ejemplo `1`–`20`.
- **Números romanos**, por ejemplo `I`–`XI`.
- **Páginas con prefijo**: un prefijo seguido directamente de un número de página positivo, por ejemplo `A8`–`A18` o `III3`–`III6`. El prefijo es una sola letra mayúscula (`A`) o un número romano válido en mayúsculas (`III`); no se admite ningún otro prefijo. El prefijo también puede indicarse una sola vez: `A8`–`18` o `III3`–`6`.

Ambas páginas deben usar la misma convención —una primera página con prefijo puede cerrarse con un número sin prefijo, pero el prefijo no puede cambiar (`III3`–`IV6` no es un intervalo válido)— y la última página no puede ser anterior a la primera. Solo se cuenta el número de página que sigue al prefijo: `III3`–`III6` abarca 4 páginas. Las páginas se guardan tal como se introducen y el número total de páginas se calcula automáticamente a partir de un intervalo completo.
