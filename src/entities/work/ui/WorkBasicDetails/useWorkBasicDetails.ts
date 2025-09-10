export const useWorkBasicDetails = () => {
  const submitPlaceholder = (data: unknown) => {
    console.log(data);
  };

  return {
    submitPlaceholder,
  };
};
