# ONIX for Books validation resources

The `.xsd` files in this directory are official ONIX for Books artifacts
published by EDItEUR (https://www.editeur.org/), copyright EDItEUR. They are
distributed here whole and unmodified; the terms and conditions of use are
reproduced in the header of every file and govern their use.

| File | Official archive |
|---|---|
| `ONIX_BookProduct_3.0_reference.xsd` | `ONIX_BookProduct_3.0_XSDs+codes_Issue_74` |
| `ONIX_BookProduct_3.0_short.xsd` | `ONIX_BookProduct_3.0_XSDs+codes_Issue_74` |
| `ONIX_BookProduct_3.0_reference_strict.xsd` | `ONIX_BookProduct_3.0_strict_XSDs+codes_Issue_74` |
| `ONIX_BookProduct_3.1_reference.xsd` | `ONIX_BookProduct_3.1_XSDs+codes_Issue_74` |
| `ONIX_BookProduct_3.1_short.xsd` | `ONIX_BookProduct_3.1_XSDs+codes_Issue_74` |
| `ONIX_BookProduct_3.1_reference_strict.xsd` | `ONIX_BookProduct_3.1_strict_XSDs+codes_Issue_74` |
| `ONIX_BookProduct_CodeLists.xsd` | identical in all four Issue 74 archives |
| `ONIX_XHTML_Subset.xsd` | `ONIX_BookProduct_3.0_XSDs+codes_Issue_74` (identical in both 3.1 archives) |

Each file is pinned by its exact SHA-256 in
`src/shared/parsers/XMLParser/validation/resources.ts`; the validator refuses
any byte that does not match. Do not edit, reformat or replace these files: a
new EDItEUR issue or revision is a separate, reviewed pin change.
