import { useQuery } from "@tanstack/react-query";

import { WorkId } from "@/src/entities/work/model/work.types";
import { isDefaultId, QueryKeys, useServices } from "@/src/shared";

import { FORMAT_IDS, MetadataEntity } from "../../model/metadata.types";

const defaultMetadata: MetadataEntity = {
  [FORMAT_IDS.ONIX_3_1]: {},
  [FORMAT_IDS.ONIX_3_0]: {},
  [FORMAT_IDS.ONIX_2_1]: {},
  [FORMAT_IDS.CSV]: {},
  [FORMAT_IDS.JSON]: {},
  [FORMAT_IDS.KBART]: {},
  [FORMAT_IDS.BIBTEX]: {},
  [FORMAT_IDS.DOIDEPOSIT]: {},
  [FORMAT_IDS.MARC21RECORD]: {},
  [FORMAT_IDS.MARC21MARKUP]: {},
  [FORMAT_IDS.MARC21XML]: {},
  [FORMAT_IDS.MARC21]: {},
};

export const useMetaData = (workId: WorkId) => {
  const isValid = workId.length > 0 && !isDefaultId(workId);

  const { metadataService } = useServices();

  const { data = defaultMetadata, isLoading, error } = useQuery({
    queryKey: [QueryKeys.metadata, workId],
    queryFn: () => metadataService.getAllSpecifications(workId),
    enabled: isValid,
    staleTime: 0,
  });

  return { data, isLoading, error };
};