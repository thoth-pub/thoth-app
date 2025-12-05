'use client';

import { WorkChaptersStateMachineContext } from '@/src/entities/work';
import { ContributionStateMachineContext } from '@/src/entities/contribution';
import { FundingStateMachineContext } from '@/src/entities/funding';
import { PublicationsStateMachineContext } from '@/src/entities/publication';
import { PublisherStateMachineContext } from '@/src/entities/publisher';
import { ReferenceStateMachineContext } from '@/src/entities/reference';
import { SeriesStateMachineContext } from '@/src/entities/series';
import { FormStateMachineContext } from '@/src/shared/store/forms/forms.provider';
import { UiStateMachineContext } from '@/src/shared/store/ui/ui.provider';
import { ServicesProvider } from '@/src/shared';

const StoreProvider = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <PublisherStateMachineContext.Provider>
      <UiStateMachineContext.Provider>
        <FormStateMachineContext.Provider>
          <ContributionStateMachineContext.Provider>
            <PublicationsStateMachineContext.Provider>
              <FundingStateMachineContext.Provider>
                <ReferenceStateMachineContext.Provider>
                  <SeriesStateMachineContext.Provider>
                    <WorkChaptersStateMachineContext.Provider>
                      <ServicesProvider>
                        {children}
                      </ServicesProvider>
                    </WorkChaptersStateMachineContext.Provider>
                  </SeriesStateMachineContext.Provider>
                </ReferenceStateMachineContext.Provider>
              </FundingStateMachineContext.Provider>
            </PublicationsStateMachineContext.Provider>
          </ContributionStateMachineContext.Provider>
        </FormStateMachineContext.Provider>
      </UiStateMachineContext.Provider>
    </PublisherStateMachineContext.Provider>
  );
};

export default StoreProvider;
