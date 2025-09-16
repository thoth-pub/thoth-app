'use client';

import { useState } from 'react';

import { IDs } from '@/src/shared/constants';
import { AccordionSection } from '@/src/shared/ui';

import { Table } from './components/Table';

const { CONTRIBUTORS } = IDs.FORM_SECTIONS;

const data = [
  {
    name: 'John Doe',
    type: 'Author',
    institution: 'University of California, Berkeley',
    bio: 'John Doe is a professor of computer science at the University of California, Berkeley.',
    rorId: 'https://ror.org/01jmxt844',
    orchidId: 'https://orcid.org/0000-0002-9641-2530',
    id: '1',
  },
  {
    name: 'Jane Doe',
    type: 'Editor',
    institution: 'University of California, Berkeley',
    bio: 'Jane Doe is a professor of computer science at the University of California, Berkeley.',
    id: '2',
  },
  {
    name: 'Jim Doe',
    type: 'Translator',
    institution: 'University of California, Berkeley',
    bio: 'Jim Doe is a professor of computer science at the University of California, Berkeley.',
    id: '3',
  },
  {
    name: 'Jill Doe',
    type: 'Illustrator',
    institution: 'University of California, Berkeley',
    bio: 'Jill Doe is a professor of computer science at the University of California, Berkeley.',
    id: '4',
  },
];

const EditWorkContributors = () => {
  const [selectedContributor, setSelectedContributor] = useState<string>('');

  return (
    <AccordionSection title="Contributors" panelId={CONTRIBUTORS} defaultExpanded>
      <Table
        data={data}
        selectedContributor={selectedContributor}
        onEdit={setSelectedContributor}
        onCloseEdit={() => setSelectedContributor('')}
        mainContributor={data[0].name}
      />
    </AccordionSection>
  );
};

export default EditWorkContributors;
