/**
 * Supported ONIX for Books source boundary (thoth#895, thoth-app#179
 * ONIX-AUDIT-VALIDATION-BASELINE-02): Release 3.0 Revision 8 and Release 3.1
 * Revision 3 (ordinary schema 3.1.3.1), Reference and Short tag flavours,
 * codelists Issue 74. ONIX 2.1 and every other release are unsupported.
 */
export type OnixRelease = '3.0' | '3.1';
export type OnixSchemaRelease = '3.0.8' | '3.1.3';
export type OnixFlavour = 'reference' | 'short';

export interface OnixSourceDescriptor {
  readonly release: OnixRelease;
  readonly schemaRelease: OnixSchemaRelease;
  readonly flavour: OnixFlavour;
  readonly namespaceURI: string;
}

export const ONIX_NAMESPACES: Readonly<
  Record<OnixRelease, Readonly<Record<OnixFlavour, string>>>
> = {
  '3.0': {
    reference: 'http://ns.editeur.org/onix/3.0/reference',
    short: 'http://ns.editeur.org/onix/3.0/short',
  },
  '3.1': {
    reference: 'http://ns.editeur.org/onix/3.1/reference',
    short: 'http://ns.editeur.org/onix/3.1/short',
  },
};

export const SCHEMA_RELEASE: Readonly<Record<OnixRelease, OnixSchemaRelease>> =
  {
    '3.0': '3.0.8',
    '3.1': '3.1.3',
  };

export const ONIX_ROOT_NAME: Readonly<Record<OnixFlavour, string>> = {
  reference: 'ONIXMessage',
  short: 'ONIXmessage',
};
