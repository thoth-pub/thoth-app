'use client';

import { ContributionStateMachineContext } from '@/src/entities/contribution';
import { PublicationsStateMachineContext } from '@/src/entities/publication';
import { PublisherStateMachineContext } from '@/src/entities/publisher';
import { FormStateMachineContext } from '@/src/shared/store/forms/forms.provider';

const StoreProvider = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <PublisherStateMachineContext.Provider>
      <FormStateMachineContext.Provider>
        <ContributionStateMachineContext.Provider>
          <PublicationsStateMachineContext.Provider>{children}</PublicationsStateMachineContext.Provider>
        </ContributionStateMachineContext.Provider>
      </FormStateMachineContext.Provider>
    </PublisherStateMachineContext.Provider>
  );
};

export default StoreProvider;
