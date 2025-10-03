'use client';

import { ContributionStateMachineContext } from '@/src/entities/contribution';
import { PublicationsStateMachineContext } from '@/src/entities/publication';
import { FormStateMachineContext } from '@/src/shared/store/forms/forms.provider';

const StoreProvider = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <FormStateMachineContext.Provider>
      <ContributionStateMachineContext.Provider>
        <PublicationsStateMachineContext.Provider>{children}</PublicationsStateMachineContext.Provider>
      </ContributionStateMachineContext.Provider>
    </FormStateMachineContext.Provider>
  );
};

export default StoreProvider;
