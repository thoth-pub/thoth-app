# Title

This section manages the **Title** of a Book Set. A Book Set is a closed sequence of volumes published together forming a single work."

Edit mode allows the editing of the following field:

- **Title**: text input for the title of the book set.
- **Subtitle**: text input for the subtitle of the book set, usually separated from the Title with a colon.
## JATS XML

Both **Title** and **Subtitle** allow formatting in JATS XML for boldface, italics, strikethrough, and underline.

- [boldface](https://jats.nlm.nih.gov/archiving/tag-library/1.4/element/bold.html): `<bold>text</bold>`
- [italics](https://jats.nlm.nih.gov/archiving/tag-library/1.4/element/italic.html): `<italic>text</italic>`
- [strikethrough](https://jats.nlm.nih.gov/archiving/tag-library/1.4/element/strike.html): `<strike>text</strike>`
- [underline](https://jats.nlm.nih.gov/archiving/tag-library/1.4/element/underline.html): `<underline>text</underline>`

## Multilingual Options

The **Language** dropdown allows setting the language of the **Title** and **Subtitle**. The list of permitted languages and language variants encompasses a two-letter [ISO 639-1](https://www.loc.gov/standards/iso639-2/php/code_list.php) language code followed by a two-letter [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/List_of_ISO_3166_country_codes) country code. The default can be set under Publisher > Imprints > Default Language.

The **Add New Translation** button allows the addition of a translation of the **Title** and **Subtitle** in another Language.
