import {QueryClient} from '@tanstack/react-query';
// Lives only in the lazy assistant chunk. No initial-page framework/provider cost.
export const assistantCache=new QueryClient({defaultOptions:{queries:{staleTime:30000,gcTime:120000,retry:false,refetchOnWindowFocus:false}}});
