import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taxonomyAdminApi } from "../taxonomy-admin.api";

export const PENDING_TAXONOMY_QUERY_KEY = ["admin", "taxonomy", "pending"] as const;

/**
 * Hook to fetch pending taxonomy entries
 */
export function usePendingTaxonomy() {
  return useQuery({
    queryKey: PENDING_TAXONOMY_QUERY_KEY,
    queryFn: () => taxonomyAdminApi.getPendingEntries(),
  });
}

/**
 * Hook to approve a taxonomy entry
 */
export function useApproveTaxonomy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (locationKey: string) =>
      taxonomyAdminApi.approveEntry(locationKey),
    onSuccess: () => {
      // Invalidate pending taxonomy query to refetch
      queryClient.invalidateQueries({ queryKey: PENDING_TAXONOMY_QUERY_KEY });
      // Invalidate countries query to show newly approved neighborhood in filters
      queryClient.invalidateQueries({ queryKey: ["countries"] });
    },
  });
}

/**
 * Hook to reject a taxonomy entry
 */
export function useRejectTaxonomy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (locationKey: string) =>
      taxonomyAdminApi.rejectEntry(locationKey),
    onSuccess: () => {
      // Invalidate pending taxonomy query to refetch
      queryClient.invalidateQueries({ queryKey: PENDING_TAXONOMY_QUERY_KEY });
    },
  });
}
