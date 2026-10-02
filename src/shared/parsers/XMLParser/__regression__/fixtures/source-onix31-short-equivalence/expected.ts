import { defineOnixRegressionFixture } from '../../fixtureSources';
import referenceTwin from '../representative-onix31-two-manifestations/expected';

/**
 * The ONIX 3.1 Short-tag twin of `representative-onix31-two-manifestations`: the same message with every element
 * named by its Short tag in the 3.1 Short namespace. Short input is normalised losslessly to Reference after its own
 * flavour's ordinary validation, and every later tier and the whole target side read only that normalised Reference
 * source. So the twin's gate finds exactly what the Reference twin's does, hands on the same normalised message, and
 * plans exactly the same Works: its normalised expectation and its scenarios ARE the Reference twin's. Only the
 * provenance differs, and it names every source tag.
 */

export default defineOnixRegressionFixture({
  id: 'source-onix31-short-equivalence',
  status: 'CONTRACT',
  purpose:
    'Proves Short-to-Reference equivalence and provenance for ONIX 3.1.3 (thoth-app#179 5619067357 section 2, ' +
    'thoth#895 5619057916): a Short source is normalised to the canonical Reference source its Reference twin ' +
    'produces, the gate and every planning scenario are exactly those of the twin, and the provenance sidecar maps ' +
    'every canonical element name back to its Short tag.',
  source: {
    origin: 'SYNTHETIC',
    provenance:
      'Generated for thoth-app#248 from the source of representative-onix31-two-manifestations (sha256 ' +
      '841349952f29fe0502c2ac472ed19e9d02f07d143cac42697657eda4650f3c9b): every element tag replaced by its Short ' +
      'tag under the tag map derived from the pinned ONIX 3.1 Reference and Short ordinary schemas, the namespace ' +
      'replaced by the 3.1 Short namespace and the header comment rewritten. Attributes, text, whitespace and order ' +
      'are unchanged.',
    sha256: 'eb6022310b02da2d0802ce318577820330a10e6d88355a746a1514c21e43ba4d',
  },
  defects: [],
  asOf: referenceTwin.asOf,
  imprints: referenceTwin.imprints,
  gate: {
    verdict: 'PERMITTED',
    release: '3.1',
    flavour: 'short',
    // As for the Reference twin: no finding at all, so no source path to report.
    findings: [],
    recoveries: [],
    provenance: {
      kind: 'RENAMED',
      flavour: 'short',
      // Every one of the source's 150 elements was named by its Short tag.
      renamedElementCount: 150,
      referenceToSource: {
        BiographicalNote: 'b044',
        CollateralDetail: 'collateraldetail',
        ComponentTypeName: 'b288',
        ContentAudience: 'x427',
        ContentDetail: 'contentdetail',
        ContentItem: 'contentitem',
        Contributor: 'contributor',
        ContributorRole: 'b035',
        Date: 'b306',
        DescriptiveDetail: 'descriptivedetail',
        EmailAddress: 'j272',
        Extent: 'extent',
        ExtentType: 'b218',
        ExtentUnit: 'b220',
        ExtentValue: 'b219',
        FirstPageNumber: 'b286',
        Header: 'header',
        IDValue: 'b244',
        Imprint: 'imprint',
        ImprintName: 'b079',
        KeyNames: 'b040',
        Language: 'language',
        LanguageCode: 'b252',
        LanguageRole: 'b253',
        LastPageNumber: 'b287',
        LevelSequenceNumber: 'b284',
        MainSubject: 'x425',
        MessageNumber: 'm180',
        NameIDType: 'x415',
        NameIdentifier: 'nameidentifier',
        NamesBeforeKey: 'b039',
        NoPrefix: 'x501',
        NotificationType: 'a002',
        NumberOfPages: 'b061',
        ONIXMessage: 'ONIXmessage',
        PageRun: 'pagerun',
        PersonName: 'b036',
        Product: 'product',
        ProductComposition: 'x314',
        ProductForm: 'b012',
        ProductFormDetail: 'b333',
        ProductIDType: 'b221',
        ProductIdentifier: 'productidentifier',
        Publisher: 'publisher',
        PublisherName: 'b081',
        PublishingDate: 'publishingdate',
        PublishingDateRole: 'x448',
        PublishingDetail: 'publishingdetail',
        PublishingRole: 'b291',
        PublishingStatus: 'b394',
        RecordReference: 'a001',
        RelatedMaterial: 'relatedmaterial',
        RelatedWork: 'relatedwork',
        Sender: 'sender',
        SenderName: 'x298',
        SentDateTime: 'x307',
        SequenceNumber: 'b034',
        Subject: 'subject',
        SubjectCode: 'b069',
        SubjectHeadingText: 'b070',
        SubjectSchemeIdentifier: 'b067',
        SubjectSchemeVersion: 'b068',
        Subtitle: 'b029',
        Text: 'd104',
        TextContent: 'textcontent',
        TextItem: 'textitem',
        TextItemType: 'b290',
        TextType: 'x426',
        TitleDetail: 'titledetail',
        TitleElement: 'titleelement',
        TitleElementLevel: 'x409',
        TitleType: 'b202',
        TitleWithoutPrefix: 'b031',
        WorkIDType: 'b201',
        WorkIdentifier: 'workidentifier',
        WorkRelationCode: 'x454',
      },
      // Nothing was recovered, so the map alone reproduces every source tag and path.
      exceptions: [],
    },
  },
  // The canonical Reference values the Reference twin hands on, read from this twin's normalised source.
  normalized: referenceTwin.normalized,
  // Exactly the Reference twin's plans, scenario for scenario.
  scenarios: referenceTwin.scenarios,
});
