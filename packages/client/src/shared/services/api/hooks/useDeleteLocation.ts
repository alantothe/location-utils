import { useMutation, useQueryClient } from "@tanstack/react-query";
import { locationsApi } from "../locations.api";
import { LOCATIONS_QUERY_KEY } from "./useLocations";

export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slug: string) => locationsApi.deleteLocation(slug),
    onSuccess: () => {
      // Invalidate and refetch locations after successful deletion
      queryClient.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY });
    },
  });
}


