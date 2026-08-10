import { ThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ContributionType } from '@/gql/graphql';
import { theme } from '@/src/shared/theme';

import type { WorkContribution } from '../../../model/contribution.types';
import { ContributionListItem } from './ContributionListItem';

const contribution: WorkContribution = {
  id: 'contribution-1',
  contributorId: 'contributor-1',
  fullName: 'Example Contributor',
  firstName: 'Example',
  lastName: 'Contributor',
  type: ContributionType.Author,
  isMain: false,
  orderNumber: 1,
  biographies: [],
  orcidId: '',
  website: '',
  affiliations: [
    {
      id: 'affiliation-1',
      contributionId: 'contribution-1',
      institutionId: 'institution-1',
      institutionName: 'University of Example',
      rorId: 'https://ror.org/012345678',
      position: 'Professor',
      orderNumber: 1,
    },
    {
      id: 'affiliation-2',
      contributionId: 'contribution-1',
      institutionId: 'institution-2',
      institutionName: 'Institution without ROR',
      rorId: '',
      position: '',
      orderNumber: 2,
    },
  ],
};

describe('ContributionListItem', () => {
  it('keeps the existing ROR link for saved contributor affiliation metadata', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider theme={theme}>
        <ContributionListItem contribution={contribution} />
      </ThemeProvider>,
    );

    expect(screen.getByText('University of Example')).toBeInTheDocument();
    expect(screen.getByText('Institution without ROR')).toBeInTheDocument();

    const rorLogos = screen.getAllByAltText('Ror');
    expect(rorLogos).toHaveLength(1);

    await user.hover(rorLogos[0]);

    const rorLink = await screen.findByRole('link', { name: '012345678' });
    expect(rorLink).toHaveAttribute('href', 'https://ror.org/012345678');
  });
});
