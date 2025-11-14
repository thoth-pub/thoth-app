'use server';

import fs from 'node:fs';
import validateSchema from 'xsd-validator';

export const validateXml = async (file: File) => {
  const xmlString = await file.text();
  const xsdString = fs.readFileSync('public/templates/schema.xsd', 'utf-8');

  const result = validateSchema(xmlString, xsdString);

  console.log('result', result);
};
