export const NOTIFICATIONS = {
  // Auth
  AUTH_FAILED: 'Invalid username or password.',
  // Works
  WORK_CREATION_SUCCESS: 'Work created successfully',
  WORK_CREATION_FAILED: 'Failed to create work',
  WORK_UPDATE_FAILED: 'Failed to update work',
  WORK_DELETE_FAILED: 'Failed to delete work',
  WORK_CONTRIBUTION_CREATION_FAILED: 'Failed to create work contribution',
  WORK_CONTRIBUTION_DELETION_FAILED: 'Failed to delete work contribution',
  WORK_CONTRIBUTION_UPDATE_FAILED: 'Failed to update work contribution',
  WORK_MOVE_RELATION_FAILED: 'Failed to change work chapters order',
  // Chapters
  CHAPTER_CREATION_SUCCESS: 'Chapter created successfully',
  CHAPTER_CREATION_FAILED: 'Failed to create chapter',
  CHAPTER_UPDATE_FAILED: 'Failed to update chapter',
  CHAPTER_DELETE_FAILED: 'Failed to delete chapter',
  // Contributors
  CONTRIBUTOR_CREATION_SUCCESS: 'Contributor created successfully',
  CONTRIBUTOR_CREATION_FAILED: 'Failed to create contributor',
  CONTRIBUTOR_UPDATE_SUCCESS: 'Contributor profile updated successfully',
  CONTRIBUTOR_UPDATE_FAILED: 'Failed to update contributor profile',
  CONTRIBUTION_MOVE_FAILED: 'Failed to change contribution order',
  // Affiliations
  AFFILIATION_CREATION_SUCCESS: 'Affiliation created successfully',
  AFFILIATION_CREATION_FAILED: 'Failed to create affiliation',
  AFFILIATION_UPDATE_SUCCESS: 'Affiliation updated successfully',
  AFFILIATION_UPDATE_FAILED: 'Failed to update affiliation',
  AFFILIATION_MOVE_FAILED: 'Failed to change affiliations order',
  // Languages
  LANGUAGE_CREATION_FAILED: 'Failed to create language',
  LANGUAGE_UPDATE_FAILED: 'Failed to update language',
  LANGUAGE_DELETE_FAILED: 'Failed to delete language',
  // Publications
  PUBLICATION_CREATION_FAILED: 'Failed to create publication',
  PUBLICATION_UPDATE_FAILED: 'Failed to update publication',
  // Prices
  PRICE_CREATION_FAILED: 'Failed to create price',
  PRICE_UPDATE_FAILED: 'Failed to update price',
  PRICE_DELETE_FAILED: 'Failed to delete price',
  // Locations
  LOCATION_DELETE_FAILED: 'Failed to delete location',
  LOCATION_UPDATE_FAILED: 'Failed to update location',
  LOCATION_CREATE_FAILED: 'Failed to create location',
  // Fundings
  FUNDING_CREATION_FAILED: 'Failed to create funding',
  FUNDING_UPDATE_FAILED: 'Failed to update funding',
  FUNDING_DELETE_FAILED: 'Failed to delete funding',
  // References
  REFERENCE_CREATION_FAILED: 'Failed to create reference',
  REFERENCE_UPDATE_FAILED: 'Failed to update reference',
  REFERENCE_DELETE_FAILED: 'Failed to delete reference',
  REFERENCE_MOVE_FAILED: 'Failed to change reference order',
  // Subjects
  SUBJECT_CREATION_FAILED: 'Failed to create subject',
  SUBJECT_UPDATE_FAILED: 'Failed to update subject',
  SUBJECT_DELETE_FAILED: 'Failed to delete subject',
  SUBJECT_MOVE_FAILED: 'Failed to change subjects order',
  // Series
  SERIES_CREATION_FAILED: 'Failed to create series',
  SERIES_UPDATE_FAILED: 'Failed to update series',
  SERIES_DELETE_FAILED: 'Failed to delete series',
  // Issues
  ISSUE_CREATION_FAILED: 'Failed to create issue',
  ISSUE_UPDATE_FAILED: 'Failed to update issue',
  ISSUE_DELETE_FAILED: 'Failed to delete issue',
  ISSUE_MOVE_FAILED: 'Failed to change issues order',
} as const;
