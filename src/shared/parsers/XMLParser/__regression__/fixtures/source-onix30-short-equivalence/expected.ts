import { defineOnixRegressionFixture } from '../../fixtureSources';
import referenceTwin from '../recoverable-empty-textcontent/expected';

/**
 * The ONIX 3.0 Short-tag twin of `recoverable-empty-textcontent`: the same message with every element named by its
 * Short tag in the 3.0 Short namespace. Short input is normalised losslessly to Reference after its own flavour's
 * ordinary validation, so the canonical tiers, the approved recovery and the whole target side see exactly what they
 * see for the Reference twin: the empty TextContent keeps its finding and is omitted, its valid sibling survives, and
 * the plans are the twin's. What the Short source adds is provenance: the finding names its Short source path, and the
 * sidecar maps every canonical name back to its Short tag - including for the surviving TextContent, which the
 * omission moved to the first canonical position while it stays the second TextContent of the uploaded source.
 */

const EMPTY_TEXT_CONTENT = '/ONIXMessage[1]/Product[1]/CollateralDetail[1]/TextContent[1]';
const SURVIVOR_SOURCE = '/ONIXmessage[1]/product[1]/collateraldetail[1]/textcontent[2]';

export default defineOnixRegressionFixture({
  id: 'source-onix30-short-equivalence',
  status: 'CONTRACT',
  purpose:
    'Proves Short-to-Reference equivalence and provenance for ONIX 3.0.8 (thoth-app#179 5619067357 sections 2 and 7, ' +
    'thoth#895 5619057916): a Short source is normalised to the canonical Reference source its Reference twin ' +
    'produces, with the same recovered finding and recovery at the same canonical path and exactly the twin plans, ' +
    'while its finding keeps the Short source path and the provenance sidecar maps every canonical element - the ' +
    'one the recovery repositioned included - back to the Short tag and path it was uploaded with.',
  source: {
    origin: 'SYNTHETIC',
    provenance:
      'Generated for thoth-app#248 from the source of recoverable-empty-textcontent (sha256 ' +
      '47df6293fe26bb16fee43ad34a78de3823f398e50d9a374a6478d8a45b4ced26): every element tag replaced by its Short ' +
      'tag under the tag map derived from the pinned ONIX 3.0 Reference and Short ordinary schemas, the namespace ' +
      'replaced by the 3.0 Short namespace and the header comment rewritten. Attributes, text, whitespace and order ' +
      'are unchanged.',
    sha256: 'ada60151d8d737b1c4ad92e4143a67e24640f18b87878cd9374a503a262d06f9',
  },
  defects: [],
  asOf: referenceTwin.asOf,
  imprints: referenceTwin.imprints,
  gate: {
    verdict: 'PERMITTED',
    release: '3.0',
    flavour: 'short',
    findings: [
      // The Reference twin's finding, at the same canonical path, also naming where the Short source has it.
      {
        id: 'ORDINARY_XSD_INVALID',
        tier: 'CANONICAL_ORDINARY',
        scope: 'VALIDITY',
        class: 'SOURCE_INVALID',
        blocking: true,
        projection: 'AUTHORITATIVE',
        recoverability: 'OMIT_INVALID_COMPOSITE',
        counts: false,
        path: EMPTY_TEXT_CONTENT,
        sourcePath: '/ONIXmessage[1]/product[1]/collateraldetail[1]/textcontent[1]',
      },
    ],
    // Recoveries are canonical: the same marker as the Reference twin's.
    recoveries: [{ recovery: 'OMIT_INVALID_COMPOSITE', path: EMPTY_TEXT_CONTENT }],
    provenance: {
      kind: 'RENAMED',
      flavour: 'short',
      // Every one of the source's 43 elements was named by its Short tag, the three the recovery omitted included.
      renamedElementCount: 43,
      referenceToSource: {
        CollateralDetail: 'collateraldetail',
        ContentAudience: 'x427',
        Date: 'b306',
        DescriptiveDetail: 'descriptivedetail',
        EmailAddress: 'j272',
        Header: 'header',
        IDValue: 'b244',
        Imprint: 'imprint',
        ImprintName: 'b079',
        Language: 'language',
        LanguageCode: 'b252',
        LanguageRole: 'b253',
        MessageNumber: 'm180',
        NoPrefix: 'x501',
        NotificationType: 'a002',
        ONIXMessage: 'ONIXmessage',
        Product: 'product',
        ProductComposition: 'x314',
        ProductForm: 'b012',
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
        Sender: 'sender',
        SenderName: 'x298',
        SentDateTime: 'x307',
        Text: 'd104',
        TextContent: 'textcontent',
        TextType: 'x426',
        TitleDetail: 'titledetail',
        TitleElement: 'titleelement',
        TitleElementLevel: 'x409',
        TitleType: 'b202',
        TitleWithoutPrefix: 'b031',
      },
      // The surviving TextContent and everything in it stand at canonical paths their source paths no longer match.
      exceptions: [
        { path: EMPTY_TEXT_CONTENT, sourcePath: SURVIVOR_SOURCE, sourceTag: 'textcontent' },
        { path: `${EMPTY_TEXT_CONTENT}/TextType[1]`, sourcePath: `${SURVIVOR_SOURCE}/x426[1]`, sourceTag: 'x426' },
        {
          path: `${EMPTY_TEXT_CONTENT}/ContentAudience[1]`,
          sourcePath: `${SURVIVOR_SOURCE}/x427[1]`,
          sourceTag: 'x427',
        },
        { path: `${EMPTY_TEXT_CONTENT}/Text[1]`, sourcePath: `${SURVIVOR_SOURCE}/d104[1]`, sourceTag: 'd104' },
      ],
    },
  },
  // The canonical Reference values the Reference twin hands on, read from this twin's normalised source.
  normalized: referenceTwin.normalized,
  // Exactly the Reference twin's plans, scenario for scenario.
  scenarios: referenceTwin.scenarios,
});
