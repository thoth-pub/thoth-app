const MD_PREFIX = '$md:';

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

export function resolveMarkdownRefs(
  resources: JsonObject,
  markdownContent: Record<string, string>,
): JsonObject {
  const result: JsonObject = {};

  for (const [key, value] of Object.entries(resources)) {
    if (typeof value === 'string' && value.startsWith(MD_PREFIX)) {
      const mdKey = value.slice(MD_PREFIX.length);
      const content = markdownContent[mdKey];

      if (!content) {
        console.warn(`Missing markdown file for reference: ${value}`);
        result[key] = value;
      } else {
        result[key] = content;
      }

    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = resolveMarkdownRefs(value as JsonObject, markdownContent);
    } else {
      result[key] = value;
    }
  }

  return result;
}
