import { useQuery } from '@tanstack/react-query';

import { QueryKeys } from '../constants/queryKeys';
import { UserInfo } from '../interfaces/auth';
// TODO: publishers
const useUserInfo = () => {
  const {
    data = { email: '', name: '', locale: null },
    isLoading,
    error,
  } = useQuery<UserInfo>({
    queryKey: [QueryKeys.userInfo],
    queryFn: () => fetch('/api/userinfo').then((res) => res.json()),
  });

  return { userInfo: data, isLoading, error };
};

export default useUserInfo;
