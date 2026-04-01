const isUUID = (id: string) => {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
};

export const isRouteIncludesUUID = (path: string) => {
  const pathParts = path.split('/');
  const lastPart = pathParts[pathParts.length - 1];

  return isUUID(lastPart);
};
