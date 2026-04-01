# Título

Esta secção gere o **Título** (obrigatório), o **Subtítulo** e a **Edição** da obra. O **Título** já terá sido indicado durante o processo de configuração.

O modo de edição permite editar os seguintes campos:

- **Título**: campo de texto para o título da obra.
- **Subtítulo**: campo de texto para o subtítulo da obra, geralmente separado do Título por dois pontos.
- **Edição**: campo numérico inteiro para o número de edição da obra. O número de edição predefinido é "1", mas é permitido qualquer número inteiro.

> "Uma edição de uma obra específica engloba geralmente todos os exemplares dessa obra que contêm o mesmo conteúdo, e que (na maioria das vezes) foram produzidos pela mesma editora. A identificação de uma edição específica por parte da editora pode dever-se a alterações no conteúdo (adição, revisão ou remoção de conteúdo) ou pode identificar produtos produzidos para um mercado específico. É importante notar que algumas edições, como as segundas edições, edições abreviadas ou edições anotadas, podem constituir obras inteiramente novas; outras podem conter o mesmo conteúdo, mas ser classificadas como uma edição diferente, como uma edição em letra grande" (BISG, *Revised Best Practices for Book Metadata,* 93).

## XML JATS

Tanto o **Título** como o **Subtítulo** permitem formatação em XML JATS para negrito, itálico, rasurado e sublinhado.

- [negrito](https://jats.nlm.nih.gov/archiving/tag-library/1.4/element/bold.html): `<bold>texto</bold>`
- [itálico](https://jats.nlm.nih.gov/archiving/tag-library/1.4/element/italic.html): `<italic>texto</italic>`
- [rasurado](https://jats.nlm.nih.gov/archiving/tag-library/1.4/element/strike.html): `<strike>texto</strike>`
- [sublinhado](https://jats.nlm.nih.gov/archiving/tag-library/1.4/element/underline.html): `<underline>texto</underline>`

## Opções Multilingues

O menu suspenso **Idioma** permite definir o idioma do **Título** e do **Subtítulo**. A lista de idiomas e variantes linguísticas permitidos inclui um código de idioma de duas letras [ISO 639-1](https://www.loc.gov/standards/iso639-2/php/code_list.php) seguido de um código de país de duas letras [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/List_of_ISO_3166_country_codes).

O botão **Adicionar Nova Tradução** permite adicionar uma tradução do **Título** e do **Subtítulo** noutro idioma.
