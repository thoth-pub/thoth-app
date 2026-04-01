import Autocomplete, { type AutocompleteProps } from '@mui/material/Autocomplete';
import type { ChipTypeMap } from '@mui/material/Chip';

const AutocompleteComponent = <
  T,
  M extends boolean | undefined,
  D extends boolean | undefined,
  F extends boolean | undefined,
  C extends React.ElementType = ChipTypeMap['defaultComponent'],
>(
  props: AutocompleteProps<T, M, D, F, C>,
) => {
  return <Autocomplete {...props} />;
};

export default AutocompleteComponent;
