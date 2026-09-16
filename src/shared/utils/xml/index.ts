/**
 * ONIX code mappings used to live here: PublishingStatus to a Work status, defaulting to Forthcoming, and
 * ContributorRole to a contribution type, defaulting to Author and reading A06 as MusicEditor. Neither default is
 * an approved reading of the source, so both were retired with the legacy ONIX projections. What an ONIX
 * publishing status or contributor role becomes in Thoth is decided only by the canonical descriptive reductions
 * (`src/shared/parsers/XMLParser/onixDescriptive.ts`, thoth-app#183), and nothing here decides it any more.
 */
export {};
