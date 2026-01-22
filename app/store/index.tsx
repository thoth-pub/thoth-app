'use client';

import { ContributionStateMachineContext } from '@/src/entities/contribution';
import { FundingStateMachineContext } from '@/src/entities/funding';
import { LocationStateMachineContext } from '@/src/entities/locations/store/location.provider';
import { PublicationsStateMachineContext } from '@/src/entities/publication';
import { PublisherStateMachineContext } from '@/src/entities/publisher';
import { ReferenceStateMachineContext } from '@/src/entities/reference';
import { SeriesStateMachineContext } from '@/src/entities/series';
import { SetStateMachineContext } from '@/src/entities/sets';
import { SubjectStateMachineContext } from '@/src/entities/subject';
import { WorkChaptersStateMachineContext } from '@/src/entities/work';
import { ServicesProvider } from '@/src/shared';
import { FormStateMachineContext } from '@/src/shared/store/forms/forms.provider';
import { UiStateMachineContext } from '@/src/shared/store/ui/ui.provider';

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
                      <SetStateMachineContext.Provider>
                        <SubjectStateMachineContext.Provider>
                          <LocationStateMachineContext.Provider>
                            <ServicesProvider>{children}</ServicesProvider>
                          </LocationStateMachineContext.Provider>
                        </SubjectStateMachineContext.Provider>
                      </SetStateMachineContext.Provider>
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
