'use client';

import { ContributionStateMachineContext } from '@/src/entities/contribution';
import { FundingStateMachineContext } from '@/src/entities/funding';
import { PublicationsStateMachineContext } from '@/src/entities/publication';
import { PublisherStateMachineContext } from '@/src/entities/publisher';
import { ReferenceStateMachineContext } from '@/src/entities/reference';
import { SeriesStateMachineContext } from '@/src/entities/series';
import { FormStateMachineContext } from '@/src/shared/store/forms/forms.provider';

const StoreProvider = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <PublisherStateMachineContext.Provider>
      <FormStateMachineContext.Provider>
        <ContributionStateMachineContext.Provider>
          <PublicationsStateMachineContext.Provider>
            <FundingStateMachineContext.Provider>
              <ReferenceStateMachineContext.Provider>
                <SeriesStateMachineContext.Provider>{children}</SeriesStateMachineContext.Provider>
              </ReferenceStateMachineContext.Provider>
            </FundingStateMachineContext.Provider>
          </PublicationsStateMachineContext.Provider>
        </ContributionStateMachineContext.Provider>
      </FormStateMachineContext.Provider>
    </PublisherStateMachineContext.Provider>
  );
};

export default StoreProvider;
