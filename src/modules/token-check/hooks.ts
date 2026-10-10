import { useQuery } from '@tanstack/react-query';

import { tokenCheckQueries } from './api';

export const useTokenCheck = (address: string | null) => useQuery(tokenCheckQueries.check(address));

export const useHolderAccess = (wallet: string | null) =>
  useQuery(tokenCheckQueries.access(wallet));
