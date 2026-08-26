'use client';

import useTypedTranslation from '@/src/shared/hooks/useTypedTranslation';
import { NAMESPACES } from '@/src/shared/i18n/model/i18n.types';
import { TextField } from '@/src/shared/ui';

import { useChangeActivePublisher } from './useChangeActivePublisher';

type ChangeActivePublisherProps = {
  isHidden?: boolean;
};

// APP-SHELL-SU-01 presentation only. The control is the application shell's
// publisher-context switcher, so it now carries an accessible label naming what
// it switches instead of being an unlabelled form control floating above
// unrelated navigation. The copy lives in the navigation namespace because that
// is the shell surface the control belongs to.
//
// Nothing about the state seam changes: the same `useChangeActivePublisher`
// hook is called with the same props, selection still goes through
// `updateActivePublisher`, and persistence, publisher-scoped query reset,
// redirects, linked-publisher derivation and the single-publisher disabled rule
// are all still owned by that unchanged hook.
const ChangeActivePublisher = ({ isHidden = false }: ChangeActivePublisherProps) => {
  const { activePublisher, publishersOptions, hideSelector, updateActivePublisher } = useChangeActivePublisher({
    isHidden,
  });
  const { t } = useTypedTranslation({ namespace: NAMESPACES.enum.navigation });

  return (
    <TextField
      options={publishersOptions}
      value={activePublisher?.id ?? ''}
      label={t('currentPublisher')}
      fullWidth
      select
      className={`w-[240px] shrink-0 ${hideSelector ? 'opacity-0' : 'opacity-100'}`}
      slotProps={{
        select: {
          MenuProps: {
            sx: {
              '& .MuiMenuItem-root': {
                textTransform: 'none',
              },
            },
          },
        },
      }}
      sx={{
        '& .MuiSelect-select': {
          textTransform: 'none',
        },
      }}
      onChange={(e) => updateActivePublisher(e.target.value)}
      disabled={publishersOptions.length <= 1}
    />
  );
};

export default ChangeActivePublisher;
