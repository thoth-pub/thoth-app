# Imprint

This section manages the **Imprints** of a particular publisher.

"The imprint name is the 'brand' name that the publisher uses as the public identity responsible for the product. Imprints usually appear on the title page and copyright page of the book, or on the physical media of audio or digital products. Imprint names usually also appear on book spines and dust jackets, audio packages, and advertisements and other marketing material" (BISG, *Revised Best Practices for Book Metadata,* 156).

For many publishers, the publisher and imprint are the same. Every publisher has at least one imprint, usually with the same name as the publisher.

Edit mode allows the editing of the following fields:

- **Imprint**: text input for the name of the imprint.
- **Imprint URL**: text input for the URL of the imprint.
- **Crossmark DOI**: text input for the Crossmark policy page DOI number. Crossmark is a service provided by Crossref that allows publishers to communicate updates, corrections, and the current status of a publication to readers.  With [Thoth Obelisk](https://thoth.pub/), Crossref membership and access to Crossmark are included. You can use the [Thoth Crossmark policy DOI](https://doi.org/10.70950/crossmark-policy) directly, or register your own DOI pointing to a policy page for your publisher (you may copy and adapt the Thoth policy if needed).  For more advanced setups, refer to Crossref’s [documentation](https://www.crossref.org/documentation/crossmark/participating-in-crossmark/).
- **Default Place**: text input for the default place of the imprint. Any new works created under the imprint will have this **Place** assigned to them by default.
- **Default Currency**: selection of the imprint's default currency from the dropdown list, following the [ISO 4217](https://en.wikipedia.org/wiki/ISO_4217) standard naming and abbreviations. Any new publications created under the imprint will have their **Price** priced in this currency by default.
- **Default Language**: selection of the imprint's default language for titles and descriptions. The list of permitted languages and language variants encompasses a two-letter [ISO 639-1](https://www.loc.gov/standards/iso639-2/php/code_list.php) language code followed by a two-letter [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/List_of_ISO_3166_country_codes) country code.

*N.B. The following are configuration fields and should only be modified if you are familiar with the storage setup.*

- **S3 Bucket**: text input for the name of the AWS S3 bucket where this imprint's files and assets are stored, e.g., `books.punctumbooks.com-book-files`.
- **CDN Domain**: text input for the public domain used to deliver this imprint's content via their CDN, e.g., `books.openbookpublishers.com`.
- **Cloudfront Distribution ID**: text input for the unique identifier for the AWS CloudFront distribution associated with this imprint, used to manage and configure content delivery, e.g., `E171JNCB05HMT1`.
