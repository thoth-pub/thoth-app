'use client';

import { EditImprint } from '@/src/entities/imprint';
import { appConfig } from '@/src/shared';
import { Button, TranslatedContent } from '@/src/shared/ui';

import { useImprintsList } from './useImprintsList';

const ImprintsList = () => {
  const {
    data,
    isEditingNewImprint,
    isAddNewButtonDisabled,
    isImprintEditable,
    addNewImprint,
    createImprint,
    updateImprint,
    deleteImprint,
  } = useImprintsList();

  return (
    <>
      <ul>
        {data.map((imprint) => (
          <li key={imprint.id}>
            <EditImprint
              defaultValue={imprint.name}
              id={imprint.id}
              deleteDisabled={data.length <= 1}
              disabled={!isImprintEditable}
              onUpdate={updateImprint}
              onDelete={deleteImprint}
            />
          </li>
        ))}
      </ul>
      {isEditingNewImprint && (
        <EditImprint id={appConfig.defaultId} disabled={!isImprintEditable} onUpdate={createImprint} />
      )}
      {isImprintEditable && (
        <Button className="mr-auto ml-4 capitalize xl:ml-0" onClick={addNewImprint} disabled={isAddNewButtonDisabled}>
          <TranslatedContent content="actions.addNewImprint" />
        </Button>
      )}
    </>
  );
};

export default ImprintsList;
