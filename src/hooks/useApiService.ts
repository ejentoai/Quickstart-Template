import { useConfig } from '@/app/context/ConfigContext';
import { ApiService } from '@/api';
import { useMemo } from 'react';

export function useApiService() {
  const { config, isLoading } = useConfig();
  
  return useMemo(() => {
    // While loading, return null (but don't show error)
    if (isLoading || !config) {
      return null;
    }
    return new ApiService(config);
  }, [config, isLoading]);
}
