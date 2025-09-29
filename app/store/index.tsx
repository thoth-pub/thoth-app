'use client';

import { ContributionStateMachineContext } from '@/src/entities/contribution';
import { FormStateMachineContext } from '@/src/shared/store/forms/forms.provider';

const StoreProvider = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <FormStateMachineContext.Provider>
      <ContributionStateMachineContext.Provider>{children}</ContributionStateMachineContext.Provider>
    </FormStateMachineContext.Provider>
  );
};

export default StoreProvider;
