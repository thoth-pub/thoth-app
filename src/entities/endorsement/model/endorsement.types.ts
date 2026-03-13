export type EndorsementDto = {
  endorsementId: string;
  workId: string;
  authorName: string | null;
  authorRole: string | null;
  url: string | null;
  text: string | null;
  endorsementOrdinal: number;
};

export type EndorsementId = string;

export type EndorsementEntity = {
  id: EndorsementId;
  workId: string;
  authorName: string;
  authorRole: string;
  url: string;
  text: string;
  orderNumber: number;
};
