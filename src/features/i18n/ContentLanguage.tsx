'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { contentLanguageOptions } from '@/src/shared/constants/formFields';
import type { Locale } from '@/src/shared/i18n/model/i18n.types';
import { TextField } from '@/src/shared/ui';

const ContentLanguage = () => {
  const { i18n } = useTranslation();
  const [locale, setLocale] = useState(i18n.language);

  const handleChange = (value: Locale) => {
    i18n.changeLanguage(value);
    setLocale(value);
  };

  return (
    <TextField
      value={locale}
      select
      options={contentLanguageOptions}
      name="contentLanguage"
      className="min-w-[300px]"
      sx={{
        '& .MuiSelect-select': {
          height: '10px',
        },
      }}
      onChange={(e) => handleChange(e.target.value as Locale)}
    />
  );
};

export default ContentLanguage;
