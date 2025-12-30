import { useMutation, useQueryClient } from "@tanstack/react-query";
import { locationsApi } from "../locations.api";

interface UseDeleteUploadOptions {
  locationId: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useDeleteUpload(options: UseDeleteUploadOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uploadId: number) => locationsApi.deleteUpload(uploadId),
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
