import { useMutation, useQueryClient } from "@tanstack/react-query";
import { locationsApi } from "../locations.api";

interface UseDeleteInstagramEmbedOptions {
  locationId: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useDeleteInstagramEmbed(options: UseDeleteInstagramEmbedOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (embedId: number) => locationsApi.deleteInstagramEmbed(embedId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location-detail", options.locationId] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      options?.onSuccess?.();
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
}
