export const NOTIFICATIONS = {
  // Auth
  AUTH_FAILED: 'Invalid username or password.',
  // Works
  WORK_CREATION_SUCCESS: 'Work created successfully',
  WORK_CREATION_FAILED: 'Failed to create work',
  WORK_BULK_CREATION_SUCCESS: 'Works created successfully',
  WORK_BULK_CREATION_FAILED: 'Failed to create works',
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
  // Awards
  AWARD_CREATION_FAILED: 'Failed to create award',
  AWARD_UPDATE_FAILED: 'Failed to update award',
  AWARD_DELETE_FAILED: 'Failed to delete award',
  AWARD_MOVE_FAILED: 'Failed to change award order',
  // Endorsements
  ENDORSEMENT_CREATION_FAILED: 'Failed to create endorsement',
  ENDORSEMENT_UPDATE_FAILED: 'Failed to update endorsement',
  ENDORSEMENT_DELETE_FAILED: 'Failed to delete endorsement',
  ENDORSEMENT_MOVE_FAILED: 'Failed to change endorsement order',
  // Book Reviews
  BOOK_REVIEW_CREATION_FAILED: 'Failed to create book review',
  BOOK_REVIEW_UPDATE_FAILED: 'Failed to update book review',
  BOOK_REVIEW_DELETE_FAILED: 'Failed to delete book review',
  BOOK_REVIEW_MOVE_FAILED: 'Failed to change book review order',
  // Additional Resources
  ADDITIONAL_RESOURCE_CREATION_FAILED: 'Failed to create additional resource',
  ADDITIONAL_RESOURCE_UPDATE_FAILED: 'Failed to update additional resource',
  ADDITIONAL_RESOURCE_DELETE_FAILED: 'Failed to delete additional resource',
  ADDITIONAL_RESOURCE_MOVE_FAILED: 'Failed to change additional resource order',
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
  // Titles
  TITLE_CREATION_FAILED: 'Failed to create title',
  TITLE_UPDATE_FAILED: 'Failed to update title',
  TITLE_DELETE_FAILED: 'Failed to delete title',
  // Abstracts
  ABSTRACT_CREATION_FAILED: 'Failed to create abstract',
  ABSTRACT_UPDATE_FAILED: 'Failed to update abstract',
  ABSTRACT_DELETE_FAILED: 'Failed to delete abstract',
  // Publishers
  PUBLISHER_CONTACT_CREATION_FAILED: 'Failed to create publisher contact',
  PUBLISHER_CONTACT_DELETION_FAILED: 'Failed to delete publisher contact',
  PUBLISHER_CONTACT_UPDATE_FAILED: 'Failed to update publisher contact',
  PUBLISHER_UPDATE_FAILED: 'Failed to update publisher',
  PUBLISHER_CREATION_FAILED: 'Failed to create publisher',
  // Biographies
  BIOGRAPHY_CREATION_FAILED: 'Failed to create biography',
  BIOGRAPHY_UPDATE_FAILED: 'Failed to update biography',
  BIOGRAPHY_DELETE_FAILED: 'Failed to delete biography',
  // Sets
  SET_CREATION_FAILED: 'Failed to create set',
  SET_UPDATE_FAILED: 'Failed to update set',
  SET_DELETE_FAILED: 'Failed to delete set',
  SET_ADD_TO_FAILED: 'Failed to add book to set',
  SET_DELETE_FROM_FAILED: 'Failed to delete book from set',
  SET_MOVE_RELATION_FAILED: 'Failed to change book order in set',
  // Imprints
  IMPRINT_CREATION_FAILED: 'Failed to create imprint',
  // Featured Video
  FEATURED_VIDEO_CREATION_FAILED: 'Failed to create featured video',
  FEATURED_VIDEO_UPDATE_FAILED: 'Failed to update featured video',
  FEATURED_VIDEO_DELETE_FAILED: 'Failed to delete featured video',
  // File Upload
  UPLOAD_FILE_FAILED: 'Failed to upload file',
  PUBLICATION_UPLOAD_FILE_DISABLED: 'DOI and landing page are required to upload a file',
} as const;
