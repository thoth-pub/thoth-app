# Title

This section manages **Title** (mandatory), **Subtitle**, and **Edition** of the work. The **Title** will already have been provided during the setup process.

Edit mode allows the editing of the following fields:

- **Title**: text input for the title of the work.
- **Subtitle**: text input for the subtitle of the work, usually separated from the Title with a colon.
- **Edition**: integer input for the edition of the work. The default edition number is “1,” but any integer is allowed.

> An edition of a particular work usually encompasses all copies of the work that contain the same content, and (most often) which have been produced by the same publisher. Publisher identification of a specified or distinct edition may be due to changes in content (addition, revision, or removal of content) or may identify products produced for a specific market. It is important to note that some editions, such as second, abridged, or annotated editions, may be new works entirely; others may contain the same content but be classified as a different edition, such as a large print edition” (BISG, *Revised Best Practices for Book Metadata,* 93).

## JATS XML

Both **Title** and **Subtitle** allow formatting in JATS XML for boldface, italics, strikethrough, and underline.

- [boldface](https://jats.nlm.nih.gov/archiving/tag-library/1.4/element/bold.html): `<bold>text</bold>`
- [italics](https://jats.nlm.nih.gov/archiving/tag-library/1.4/element/italic.html): `<italic>text</italic>`
- [strikethrough](https://jats.nlm.nih.gov/archiving/tag-library/1.4/element/strike.html): `<strike>text</strike>`
- [underline](https://jats.nlm.nih.gov/archiving/tag-library/1.4/element/underline.html): `<underline>text</underline>`

## Multilingual Options

The **Language** dropdown allows setting the language of the **Title** and **Subtitle**. The list of permitted languages and language variants encompasses a two-letter [ISO 639-1](https://www.loc.gov/standards/iso639-2/php/code_list.php) language code followed by a two-letter [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/List_of_ISO_3166_country_codes) country code.

The **Add New Translation** button allows the addition of a translation of the **Title** and **Subtitle** in another Language.
