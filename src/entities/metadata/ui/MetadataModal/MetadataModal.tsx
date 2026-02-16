'use client';

import { useState } from 'react';

import type { WorkId } from '@/src/entities/work/model/work.types';
import { CloseButton, Modal, Tab, TabPanel, Tabs, TranslatedContent, Typography } from '@/src/shared/ui';

import { useMetaData } from '../../api/hooks/useMetaData';
import { FORMAT_IDS } from '../../model/metadata.types';
import { LinksList } from './components/LinksList';

type MetadataModalProps = {
  open: boolean;
  workId: WorkId;
  onClose: () => void;
};

const METADATA_TABS = [
  { label: 'ONIX 3.1', value: '1', key: FORMAT_IDS.ONIX_3_1 },
  { label: 'ONIX 3.0', value: '2', key: FORMAT_IDS.ONIX_3_0 },
  { label: 'ONIX 2.1', value: '3', key: FORMAT_IDS.ONIX_2_1 },
  { label: 'CSV', value: '4', key: FORMAT_IDS.CSV },
  { label: 'JSON', value: '5', key: FORMAT_IDS.JSON },
  { label: 'KBART', value: '6', key: FORMAT_IDS.KBART },
  { label: 'BibTex', value: '7', key: FORMAT_IDS.BIBTEX },
  { label: 'DOIdeposit', value: '8', key: FORMAT_IDS.DOIDEPOSIT },
  { label: 'MARC 21', value: '9', key: FORMAT_IDS.MARC21 },
] as const;

const MetadataModal = (props: MetadataModalProps) => {
  const { open, workId, onClose } = props;

  const { data: metadata } = useMetaData(workId);

  const [activeTab, setActiveTab] = useState('1');

  const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  return (
    <Modal open={open} onClose={onClose} className="p-4">
      <div className="flex h-full items-center justify-center">
        <div className="m-auto flex max-h-160 w-full max-w-300 flex-col gap-4 overflow-auto rounded-xl bg-(--color-modal-background) p-4 lg:gap-8 lg:rounded-2xl lg:p-8">
          <div className="flex justify-between">
            <Typography variant="h2" component="h3" className="text-(--color-typography)">
              <TranslatedContent content="actions.downloadMetadata" />
            </Typography>
            <CloseButton onClose={onClose} />
          </div>
          <Tabs
            value={activeTab}
            onChange={handleChange}
            indicatorColor="primary"
            textColor="inherit"
            variant="scrollable"
            aria-label="full width tabs example"
            scrollButtons
            allowScrollButtonsMobile
            className="m-auto max-w-full"
          >
            {METADATA_TABS.map((tab, index) => (
              <Tab key={tab.value} label={tab.label} value={tab.value} index={index} />
            ))}
          </Tabs>
          {METADATA_TABS.map((tab, index) => (
            <TabPanel key={tab.value} value={tab.value} activeValue={activeTab} index={index}>
              <LinksList links={metadata[tab.key]} />
            </TabPanel>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default MetadataModal;
