export const serverErrorParser = (error: string, placeholder: string): string => {
  try {
    const json = JSON.parse(error);
    const errors = json.errors;

    if (!errors || errors.length === 0) {
      return placeholder;
    }

    const message = errors[0].message;

    if (!message) {
      return placeholder;
    }

    return errors[0].message;
  } catch (error) {
    return placeholder;
  }
};
