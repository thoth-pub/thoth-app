export const isCsv = (file: File) => file.type === 'text/csv' || file.name.endsWith('.csv');

export const isXml = (file: File) =>
  file.type === 'text/xml' || file.type === 'application/xml' || file.name.endsWith('.xml');
