# Page Range

This section manages the **Total Page Count** as well as the **First Page** and **Last Page**.

Edit mode allows the editing of the following fields:

- **Total Page Count**: integer input for the total number of pages in the chapter.
- **First Page**: text input for the first page of the chapter.
- **Last Page**: text input for the last page of the chapter.

First Page and Last Page accept three numbering conventions:

- **Numbers**, such as `1`–`20`.
- **Roman numerals**, such as `I`–`XI`.
- **Prefixed pages**: a prefix followed immediately by a positive page number, such as `A8`–`A18` or `III3`–`III6`. The prefix is either one uppercase letter (`A`) or a valid uppercase Roman numeral (`III`); no other prefix is accepted. The prefix may also be given once, as `A8`–`18` or `III3`–`6`.

Both pages must use the same convention — a prefixed first page may be closed by a plain number, but the prefix must not change, so `III3`–`IV6` is not a range — and the last page must not come before the first. Only the page number after the prefix is counted: `III3`–`III6` is 4 pages. Pages are stored exactly as entered, and the total page count is calculated automatically from a complete range.
