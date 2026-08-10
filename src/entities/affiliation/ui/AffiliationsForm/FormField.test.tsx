import { ThemeProvider } from '@mui/material';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { InstitutionEntity } from '@/src/entities/institution/model/institution.types';
import { appConfig } from '@/src/shared/config';
import { theme } from '@/src/shared/theme';

import type { AffiliationsForm } from '../../model/affiliation.types';
import { FormField } from './FormField';

const mocks = vi.hoisted(() => ({
  useDebouncedValue: vi.fn((value: string) => value),
  useInstitutions: vi.fn(),
}));

vi.mock('@/src/entities/institution', () => ({
  useInstitutions: mocks.useInstitutions,
}));

vi.mock('@/src/shared/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/shared/hooks')>()),
  useDebouncedValue: mocks.useDebouncedValue,
  useTypedTranslation: vi.fn(() => ({ t: (key: string) => key })),
}));

const institutions: InstitutionEntity[] = [
  {
    id: 'institution-1',
    name: 'University of Example',
    ror: 'https://ror.org/012345678',
    doi: '',
    countryCode: 'GB',
    updatedAt: '',
  },
  {
    id: 'institution-2',
    name: 'University of Example',
    ror: 'https://ror.org/087654321',
    doi: '',
    countryCode: 'US',
    updatedAt: '',
  },
  {
    id: 'institution-3',
    name: 'Institution without ROR',
    ror: '',
    doi: '',
    countryCode: 'CA',
    updatedAt: '',
  },
];

type TestFormProps = {
  onSubmit: (data: AffiliationsForm) => void;
};

const TestForm = ({ onSubmit }: TestFormProps) => {
  const { control, handleSubmit } = useForm<AffiliationsForm>({
    defaultValues: {
      affiliations: [
        {
          id: 'affiliation-1',
          affiliationId: 'affiliation-1',
          affiliation: { value: '', label: '' },
          position: '',
        },
      ],
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormField
        control={control}
        affiliationFieldName="affiliations.0.affiliation"
        positionFieldName="affiliations.0.position"
        onRemove={vi.fn()}
      />
      <button type="submit">Save</button>
    </form>
  );
};

const renderForm = (onSubmit = vi.fn()) => {
  render(
    <ThemeProvider theme={theme}>
      <TestForm onSubmit={onSubmit} />
    </ThemeProvider>,
  );

  return { onSubmit };
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AffiliationsForm FormField', () => {
  it('renders same-name institutions with distinct ROR metadata and keeps the selected value canonical', async () => {
    mocks.useInstitutions.mockReturnValue({ institutions, loading: false });
    const { onSubmit } = renderForm();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'University' } });

    expect(mocks.useDebouncedValue).toHaveBeenLastCalledWith('University', appConfig.fieldsDebounceDelay);
    expect(mocks.useInstitutions).toHaveBeenLastCalledWith({ filter: 'University' });

    const options = await screen.findAllByRole('option');

    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent('University of Example');
    expect(options[0]).toHaveTextContent('ROR: 012345678');
    expect(options[1]).toHaveTextContent('University of Example');
    expect(options[1]).toHaveTextContent('ROR: 087654321');
    expect(options[0].id).not.toBe(options[1].id);
    expect(options[2]).toHaveTextContent('Institution without ROR');
    expect(options[2]).not.toHaveTextContent('ROR:');

    fireEvent.click(options[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          affiliations: [
            expect.objectContaining({
              affiliation: { value: 'institution-1', label: 'University of Example' },
            }),
          ],
        }),
        expect.anything(),
      ),
    );
  });

  it('forwards a ROR search and keeps server-returned results selectable', async () => {
    mocks.useInstitutions.mockReturnValue({ institutions, loading: false });
    const { onSubmit } = renderForm();
    const rorSearch = 'https://ror.org/087654321';

    fireEvent.change(screen.getByRole('combobox'), { target: { value: rorSearch } });

    expect(mocks.useInstitutions).toHaveBeenLastCalledWith({ filter: rorSearch });

    const matchingOption = (await screen.findAllByRole('option')).find((option) =>
      option.textContent?.includes('ROR: 087654321'),
    );

    expect(matchingOption).toBeDefined();

    fireEvent.click(matchingOption!);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          affiliations: [
            expect.objectContaining({
              affiliation: { value: 'institution-2', label: 'University of Example' },
            }),
          ],
        }),
        expect.anything(),
      ),
    );
  });

  it('passes institution loading state through to the autocomplete', async () => {
    mocks.useInstitutions.mockReturnValue({ institutions: [], loading: true });

    renderForm();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'loading' } });

    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });
});
