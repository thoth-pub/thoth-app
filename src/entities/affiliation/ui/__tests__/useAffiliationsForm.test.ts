import { describe, it, expect, vi } from 'vitest';

const mockInvalidate = vi.fn();

const mockCreateAffiliation = vi.fn();
const mockUpdateAffiliation = vi.fn();
const mockDeleteAffiliation = vi.fn();

vi.mock('@/src/entities/affiliation', () => ({
  useCreateAffiliation: () => ({ createAffiliation: mockCreateAffiliation }),
  useUpdateAffiliation: () => ({ updateAffiliation: mockUpdateAffiliation }),
  useDeleteAffiliation: () => ({ deleteAffiliation: mockDeleteAffiliation }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({ invalidateQueries: mockInvalidate })),
}));

vi.mock('@/src/shared/config', async () => {
  const actual = await vi.importActual('@/src/shared/config');
  return actual;
});

import { appConfig } from '@/src/shared/config';
import useEditContributionAffiliations from '../useAffiliationsForm';

const CONTRIBUTION_ID = 'contrib-1';
const CONTRIBUTION_ID_2 = 'contrib-2';
const EXISTING_AFF_ID = 'aff-1';
const NEW_AFF_ID = appConfig.defaultId;

const mockInstitution = { value: 'inst-1', label: 'Inst 1' };
const mockInstitution2 = { value: 'inst-2', label: 'Inst 2' };

function setup() {
  vi.clearAllMocks();
}

describe('useEditContributionAffiliations', () => {
  describe('updateAffiliations', () => {
    it('creates new affiliations and updates existing ones', async () => {
      setup();
      const existingAffiliation = {
        id: EXISTING_AFF_ID,
        contributionId: CONTRIBUTION_ID,
        institutionId: 'inst-1',
        institutionName: 'Inst 1',
        rorId: '',
        position: 'Author',
        orderNumber: 1,
      };

      const { updateAffiliations } = useEditContributionAffiliations({
        contributionId: CONTRIBUTION_ID,
        affiliations: [existingAffiliation],
      });

      const formData = {
        affiliations: [
          { id: EXISTING_AFF_ID, affiliationId: 'rel-1', affiliation: mockInstitution, position: 'Editor' },
          { id: NEW_AFF_ID, affiliationId: '', affiliation: mockInstitution2, position: '' },
        ],
      };

      await updateAffiliations(formData);

      expect(mockCreateAffiliation).toHaveBeenCalledTimes(1);
      expect(mockUpdateAffiliation).toHaveBeenCalledTimes(1);
      expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
      expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work'] });
    });

    it('handles empty affiliations', async () => {
      setup();
      const { updateAffiliations } = useEditContributionAffiliations({
        contributionId: CONTRIBUTION_ID,
        affiliations: [],
      });

      await updateAffiliations({ affiliations: [] });

      expect(mockCreateAffiliation).not.toHaveBeenCalled();
      expect(mockUpdateAffiliation).not.toHaveBeenCalled();
    });
  });

  describe('deleteContributionAffiliation', () => {
    it('deletes a single affiliation and invalidates cache', async () => {
      setup();
      const { deleteAffiliation } = useEditContributionAffiliations({
        contributionId: CONTRIBUTION_ID,
        affiliations: [],
      });

      deleteAffiliation(EXISTING_AFF_ID);

      expect(mockDeleteAffiliation).toHaveBeenCalledWith(EXISTING_AFF_ID);
      expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
      expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work'] });
    });
  });

  describe('deleteBulkAffiliations', () => {
    it('deletes all given affiliations and invalidates cache', async () => {
      setup();
      const { deleteBulkAffiliations } = useEditContributionAffiliations({
        contributionId: CONTRIBUTION_ID,
        affiliations: [],
      });

      await deleteBulkAffiliations(['aff-1', 'aff-2']);

      expect(mockDeleteAffiliation).toHaveBeenCalledTimes(2);
      expect(mockDeleteAffiliation).toHaveBeenCalledWith('aff-1');
      expect(mockDeleteAffiliation).toHaveBeenCalledWith('aff-2');
      expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
      expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work'] });
    });
  });

  describe('updateBulkAffiliations', () => {
    it('deletes existing affiliations and creates new ones for each contribution ID', async () => {
      setup();
      const existingAffiliation = {
        id: EXISTING_AFF_ID,
        contributionId: CONTRIBUTION_ID,
        institutionId: 'inst-1',
        institutionName: 'Inst 1',
        rorId: '',
        position: 'Author',
        orderNumber: 1,
      };

      const { updateBulkAffiliations } = useEditContributionAffiliations({
        contributionId: CONTRIBUTION_ID,
        affiliations: [existingAffiliation],
      });

      const formData = {
        affiliations: [
          { id: NEW_AFF_ID, affiliationId: '', affiliation: mockInstitution, position: '' },
        ],
      };

      await updateBulkAffiliations(formData, [CONTRIBUTION_ID, CONTRIBUTION_ID_2]);

      expect(mockDeleteAffiliation).toHaveBeenCalledWith(EXISTING_AFF_ID);
      expect(mockCreateAffiliation).toHaveBeenCalledTimes(2);
      expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['workChapters'] });
      expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['work'] });
    });

    it('handles no existing affiliations', async () => {
      setup();
      const { updateBulkAffiliations } = useEditContributionAffiliations({
        contributionId: CONTRIBUTION_ID,
        affiliations: [],
      });

      const formData = {
        affiliations: [
          { id: NEW_AFF_ID, affiliationId: '', affiliation: mockInstitution, position: '' },
        ],
      };

      await updateBulkAffiliations(formData, [CONTRIBUTION_ID]);

      expect(mockDeleteAffiliation).not.toHaveBeenCalled();
      expect(mockCreateAffiliation).toHaveBeenCalledTimes(1);
    });
  });
});
