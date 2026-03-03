/* eslint-disable @eslint-react/no-context-provider */
'use client';

import { ContributionStateMachineContext } from '@/src/entities/contribution';
import { FundingStateMachineContext } from '@/src/entities/funding';
import { LocationStateMachineContext } from '@/src/entities/locations';
import { PublicationsStateMachineContext } from '@/src/entities/publication';
import { PublisherStateMachineContext } from '@/src/entities/publisher';
import { ReferenceStateMachineContext } from '@/src/entities/reference';
import { SeriesStateMachineContext } from '@/src/entities/series';
import { SetStateMachineContext } from '@/src/entities/sets';
import { SubjectStateMachineContext } from '@/src/entities/subject';
import { WorkStateMachineContext } from '@/src/entities/work';
import { ServicesProvider } from '@/src/shared/context';
import { FormStateMachineContext } from '@/src/shared/store/forms/forms.provider';
import { UIProvider } from '@/src/shared/store/ui/ui.context';

const StoreProvider = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <PublisherStateMachineContext.Provider>
      <FormStateMachineContext.Provider>
        <ContributionStateMachineContext.Provider>
          <PublicationsStateMachineContext.Provider>
            <FundingStateMachineContext.Provider>
              <ReferenceStateMachineContext.Provider>
                <SeriesStateMachineContext.Provider>
                  <WorkStateMachineContext.Provider>
                    <SetStateMachineContext.Provider>
                      <SubjectStateMachineContext.Provider>
                        <LocationStateMachineContext.Provider>
                          <UIProvider>
                            <ServicesProvider>{children}</ServicesProvider>
                          </UIProvider>
                        </LocationStateMachineContext.Provider>
                      </SubjectStateMachineContext.Provider>
                    </SetStateMachineContext.Provider>
                  </WorkStateMachineContext.Provider>
                </SeriesStateMachineContext.Provider>
              </ReferenceStateMachineContext.Provider>
            </FundingStateMachineContext.Provider>
          </PublicationsStateMachineContext.Provider>
        </ContributionStateMachineContext.Provider>
      </FormStateMachineContext.Provider>
    </PublisherStateMachineContext.Provider>
  );
};

export default StoreProvider;
