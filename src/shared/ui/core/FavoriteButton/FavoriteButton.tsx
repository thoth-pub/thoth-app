import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';

import IconButton, { type IconButtonProps } from '../IconButton/IconButton';

type FavoriteButtonProps = {
  isFavorite: boolean;
} & IconButtonProps;

const FavoriteButton = (props: FavoriteButtonProps) => {
  const { isFavorite, ...rest } = props;

  return <IconButton {...rest}>{isFavorite ? <StarIcon /> : <StarBorderIcon />}</IconButton>;
};

export default FavoriteButton;
