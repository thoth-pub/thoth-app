# Intervalo de Páginas

Esta secção gere o **Número Total de Páginas**, bem como a **Primeira Página** e a **Última Página**.

O modo de edição permite editar os seguintes campos:

- **Número Total de Páginas**: campo numérico inteiro para o número total de páginas do capítulo.
- **Primeira Página**: campo de texto para a primeira página do capítulo.
- **Última Página**: campo de texto para a última página do capítulo.

A Primeira Página e a Última Página aceitam três convenções de numeração:

- **Números**, por exemplo `1`–`20`.
- **Numeração romana**, por exemplo `I`–`XI`.
- **Páginas com prefixo**: um prefixo seguido diretamente de um número de página positivo, por exemplo `A8`–`A18` ou `III3`–`III6`. O prefixo é uma única letra maiúscula (`A`) ou um numeral romano válido em maiúsculas (`III`); nenhum outro prefixo é aceite. O prefixo também pode ser indicado apenas uma vez: `A8`–`18` ou `III3`–`6`.

Ambas as páginas devem usar a mesma convenção — uma primeira página com prefixo pode ser fechada por um número sem prefixo, mas o prefixo não pode mudar (`III3`–`IV6` não é um intervalo válido) — e a última página não pode ser anterior à primeira. Apenas o número de página após o prefixo é contado: `III3`–`III6` corresponde a 4 páginas. As páginas são guardadas exatamente como foram introduzidas e o número total de páginas é calculado automaticamente a partir de um intervalo completo.
