import SearchIcon from '@mui/icons-material/Search';

import { CreateNewWorkLink } from '@/src/features';
import { InputAdornment, TextField, Typography } from '@/src/shared/ui';
import ContentSection from '@/src/shared/ui/layout/ContentSection/ContentSection';

type HeaderProps = {
  searchValue: string;
  onSearch: (value: string) => void;
};

export const Header = ({ searchValue, onSearch }: HeaderProps) => {
  return (
    <ContentSection>
      <div className="flex items-center justify-between gap-2">
        <Typography variant="h1">Books</Typography>
        <TextField
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="primary" />
                </InputAdornment>
              ),
            },
          }}
          value={searchValue}
          className="max-w-[800px]"
          placeholder="Search by title, DOI, internal reference"
          fullWidth
          onChange={(e) => onSearch(e.target.value)}
        />
        <CreateNewWorkLink />
      </div>
    </ContentSection>
  );
};
