/**
 * EDItEUR ONIX codelists, pinned.
 *
 * The values below are transcribed from the EDItEUR codelist browser at **Issue 74**
 * (https://ns.editeur.org/onix/en/<list>), which the accepted audit fixed as this programme's
 * codelist evidence. They are a deliberate pin, not a snapshot that drifts: EDItEUR publishes a
 * new issue roughly quarterly, and following it automatically would silently change what this
 * importer calls valid ONIX. Moving to a later issue is a deliberate maintenance change here.
 *
 * The pin is owned here rather than taken from `@5stones/onix`'s generated enums, which were
 * generated from an earlier issue and are already behind: their List 153 stops at 37 where Issue
 * 74 defines 39, and their List 44 stops at 44 where Issue 74 defines 45. Validating against them
 * would report valid Issue-74 ONIX as malformed — the exact failure mode the audit forbids.
 *
 * Only the lists this parser validates are pinned. Adding a list means adding its Issue-74 values
 * here, so that what the importer claims to check and what it really checks cannot diverge.
 */

/** The EDItEUR codelists issue every value below is taken from. */
export const ONIX_CODELIST_ISSUE = 74;

/** The codelists this parser validates against the pin. */
export type OnixCodelistNumber = 22 | 44 | 74 | 153 | 154;

const values = (list: string): ReadonlySet<string> => new Set(list.split(' ').filter((value) => value.length > 0));

/** List 22, language role. */
const LANGUAGE_ROLE = values('01 02 03 06 07 08 09 10 11 12 13 14 15');

/** List 44, name identifier type. `21` is ORCID; `09`, `11` and `14` are not defined. */
const NAME_IDENTIFIER_TYPE = values(
  '01 02 03 04 05 06 07 08 10 12 13 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 ' +
    '37 38 39 40 41 42 43 44 45',
);

/** List 153, text type. */
const TEXT_TYPE = values(
  '01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 ' +
    '34 35 36 37 38 39',
);

/** List 154, content audience. */
const CONTENT_AUDIENCE = values('00 01 02 03 04 05 06 07 08 09 10 11 12');

/**
 * List 74, language code — based on ISO 639-2/B.
 *
 * The bibliographic codes, so `ger`, `fre` and `dut` are in the list and their terminological
 * alternatives `deu`, `fra` and `nld` are not. The `qaa`-`qtz` range ISO 639-2 reserves for local
 * use is accepted by {@link isOnixCodelistValue} as a range rather than enumerated: EDItEUR
 * assigns codes inside it between issues, and the range as a whole is reserved either way.
 */
const LANGUAGE_CODE = values(
  'aar abk ace ach ada ady afa afh afr ain aka akk alb ale alg alt amh ang anp apa ara arc arg arm arn ' +
  'arp art arw asm ast ath aus ava ave awa aym aze bad bai bak bal bam ban baq bas bat bej bel bem ben ' +
  'ber bho bih bik bin bis bla bnt bos bra bre btk bua bug bul bur byn cad cai car cat cau ceb cel cha ' +
  'chb che chg chi chk chm chn cho chp chr chu chv chy cmc cnr cop cor cos cpe cpf cpp cre crh crp csb ' +
  'cus cze dak dan dar day del den dgr din div doi dra dsb dua dum dut dyu dzo efi egy eka elx eng enm ' +
  'epo est ewe ewo fan fao fat fij fil fin fiu fon fre frm fro frr frs fry ful fur gaa gay gba gem geo ' +
  'ger gez gil gla gle glg glv gmh goh gon gor got grb grc gre grn gsw guj gwi hai hat hau haw heb her ' +
  'hil him hin hit hmn hmo hrv hsb hun hup iba ibo ice ido iii ijo iku ile ilo ina inc ind ine inh ipk ' +
  'ira iro ita jav jbo jpn jpr jrb kaa kab kac kal kam kan kar kas kau kaw kaz kbd kha khi khm kho kik ' +
  'kin kir kmb kok kom kon kor kos kpe krc krl kro kru kua kum kur kut lad lah lam lao lat lav lez lim ' +
  'lin lit lol loz ltz lua lub lug lui lun luo lus mac mad mag mah mai mak mal man mao map mar mas may ' +
  'mdf mdr men mga mic min mis mkh mlg mlt mnc mni mno moh mon mos mul mun mus mwl mwr myn myv nah nai ' +
  'nap nau nav nbl nde ndo nds nep new nia nic niu nno nob nog non nor nqo nso nub nwc nya nym nyn nyo ' +
  'nzi oci oji ori orm osa oss ota oto paa pag pal pam pan pap pau peo per phi phn pli pol pon por pra ' +
  'pro pus que raj rap rar roa roh rom rum run rup rus sad sag sah sai sal sam san sas sat scn sco sel ' +
  'sem sga sgn shn sid sin sio sit sla slo slv sma sme smi smj smn smo sms sna snd snk sog som son sot ' +
  'spa srd srn srp srr ssa ssw suk sun sus sux swa swe syc syr tah tai tam tat tel tem ter tet tgk tgl ' +
  'tha tib tig tir tiv tkl tlh tli tmh tog ton tpi tsi tsn tso tuk tum tup tur tut tvl twi tyv udm uga ' +
  'uig ukr umb und urd uzb vai ven vie vol vot wak wal war was wel wen wln wol xal xho yao yap yid yor ' +
  'ypk zap zbl zen zgh zha znd zul zun zxx zza ',
);

const CODELISTS: Record<OnixCodelistNumber, ReadonlySet<string>> = {
  22: LANGUAGE_ROLE,
  44: NAME_IDENTIFIER_TYPE,
  74: LANGUAGE_CODE,
  153: TEXT_TYPE,
  154: CONTENT_AUDIENCE,
};

/** ISO 639-2's local-use range, which List 74 reserves and EDItEUR fills in over time. */
const RESERVED_LANGUAGE_RANGE = /^q[a-t][a-z]$/;

/**
 * Whether a value belongs to the codelist that declares it, at the pinned issue.
 *
 * Case sensitive and whitespace sensitive, because the codelists are: `01` is a code and ` 01`
 * is not, so callers read the element's text before asking rather than being quietly forgiven
 * here.
 */
export const isOnixCodelistValue = (codelist: OnixCodelistNumber, value: string): boolean =>
  CODELISTS[codelist].has(value) || (codelist === 74 && RESERVED_LANGUAGE_RANGE.test(value));
