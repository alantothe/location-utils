import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  usePendingTaxonomy,
  useApproveTaxonomy,
  useTaxonomyCorrections,
  useCreateTaxonomyCorrection,
  useDeleteTaxonomyCorrection,
  useApprovedTaxonomy,
} from "@client/shared/services/api/hooks";
import { Button } from "@client/components/ui/button";
import { formatLocationHierarchy } from "@client/shared/lib/utils";
import { FormInput, FormSelect } from "@client/shared/components/forms";
import { SelectItem } from "@client/components/ui/select";

/**
 * Validation schema for correction form
 */
const correctionSchema = z.object({
  incorrect_value: z.string()
    .min(1, "Required")
    .regex(/^[a-z0-9-]+$/, "Must be lowercase with hyphens only"),
  correct_value: z.string()
    .min(1, "Required")
    .regex(/^[a-z0-9-]+$/, "Must be lowercase with hyphens only"),
  part_type: z.enum(["country", "city", "neighborhood"]),
}).refine(data => data.incorrect_value !== data.correct_value, {
  message: "Values cannot be the same",
  path: ["correct_value"],
});

type CorrectionFormData = z.infer<typeof correctionSchema>;

export function TaxonomyReview() {
  // Pending taxonomy state
  const { data: pendingEntries, isLoading, error } = usePendingTaxonomy();
  const approveMutation = useApproveTaxonomy();
  const [processingKey, setProcessingKey] = useState<string | null>(null);

  // Corrections state
  const { data: corrections, isLoading: correctionsLoading } = useTaxonomyCorrections();
  const createCorrectionMutation = useCreateTaxonomyCorrection();
  const deleteCorrectionMutation = useDeleteTaxonomyCorrection();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Approved taxonomy state
  const { data: approvedData, isLoading: approvedLoading } = useApprovedTaxonomy();

  // Form state
  const { control, handleSubmit, reset, setValue } = useForm<CorrectionFormData>({
    resolver: zodResolver(correctionSchema),
    defaultValues: {
      incorrect_value: "",
      correct_value: "",
      part_type: "city",
    },
  });

  // Pending taxonomy handlers
  const handleApprove = async (locationKey: string) => {
    setProcessingKey(locationKey);
    try {
      await approveMutation.mutateAsync(locationKey);
    } finally {
      setProcessingKey(null);
    }
  };


  // Correction handlers
  const onSubmit = async (data: CorrectionFormData) => {
    try {
      await createCorrectionMutation.mutateAsync(data);
      reset();
    } catch (error) {
      console.error("Failed to create correction:", error);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteCorrectionMutation.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleQuickFill = (locationKey: string) => {
    const parts = locationKey.split("|");

    // Pre-fill with city (most common case)
    if (parts[1]) {
      setValue("incorrect_value", parts[1]);
      setValue("part_type", "city");
    }

    // Scroll to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* SECTION 1: TAXONOMY CORRECTIONS */}
      <div data-theme="light" className="bg-background rounded-lg shadow-lg p-6 mb-6">
        <div className="mb-6">
          <h2 className="text-[20px] font-bold mb-2 text-foreground">Taxonomy Corrections</h2>
          <p className="text-muted-foreground">
            Create rules to automatically fix malformed location data from geocoding APIs.
          </p>
        </div>

        {/* Correction Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="mb-6 p-4 bg-muted rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FormInput
              name="incorrect_value"
              label="Incorrect Value"
              control={control}
              placeholder="bras-lia"
            />
            <FormInput
              name="correct_value"
              label="Correct Value"
              control={control}
              placeholder="brasilia"
            />
            <FormSelect
              name="part_type"
              label="Part Type"
              control={control}
            >
              <SelectItem value="country">Country</SelectItem>
              <SelectItem value="city">City</SelectItem>
              <SelectItem value="neighborhood">Neighborhood</SelectItem>
            </FormSelect>
            <div className="flex items-end">
              <Button
                type="submit"
                disabled={createCorrectionMutation.isPending}
                className="w-full"
              >
                {createCorrectionMutation.isPending ? "Adding..." : "Add Rule"}
              </Button>
            </div>
          </div>
        </form>

        {/* Corrections Table */}
        {correctionsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
          </div>
        ) : corrections && corrections.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Incorrect
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Correct
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Part Type
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-background divide-y divide-border">
                {corrections.map((correction) => (
                  <tr key={correction.id} className="hover:bg-accent">
                    <td className="px-4 py-2">
                      <code className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                        {correction.incorrect_value}
                      </code>
                    </td>
                    <td className="px-4 py-2">
                      <code className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {correction.correct_value}
                      </code>
                    </td>
                    <td className="px-4 py-2 capitalize text-sm">
                      {correction.part_type}
                    </td>
                    <td className="px-4 py-2 text-sm text-muted-foreground">
                      {new Date(correction.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        onClick={() => handleDelete(correction.id)}
                        disabled={deletingId === correction.id}
                        variant="destructive"
                        size="sm"
                      >
                        {deletingId === correction.id ? "Deleting..." : "Delete"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">
            No correction rules yet. Add one above to fix malformed location data.
          </p>
        )}
      </div>

      {/* SECTION 2: PENDING TAXONOMY */}
      <div data-theme="light" className="bg-background rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <h1 className="text-[24px] font-bold mb-2 text-foreground">Pending Taxonomy</h1>
          <p className="text-muted-foreground">
            Review and approve new neighborhoods discovered from location data.
            Only approved neighborhoods appear in public filters.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
            <p className="font-medium">Error loading pending entries</p>
            <p className="text-sm">Please try again later.</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground"></div>
          </div>
        ) : pendingEntries && pendingEntries.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-green-500 text-6xl mb-4">✓</div>
            <p className="text-muted-foreground">
              No pending taxonomy entries. All neighborhoods are approved!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    LocationKey
                  </th>
                  <th className="px-6 py-3 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Locations Using
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider" style={{ width: '320px' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-background divide-y divide-border">
                {pendingEntries?.map((entry) => (
                  <tr key={entry.locationKey} className="hover:bg-accent">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs bg-muted px-2 py-1 rounded text-foreground">
                        {formatLocationHierarchy(entry.locationKey)}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {entry.locationCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 capitalize">
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <Button
                        onClick={() => handleApprove(entry.locationKey)}
                        disabled={processingKey === entry.locationKey}
                        className="bg-green-600 hover:bg-green-700 text-white border-0"
                        size="sm"
                      >
                        {processingKey === entry.locationKey && approveMutation.isPending
                          ? "Approving..."
                          : "✓ Approve"}
                      </Button>
                      <Button
                        onClick={() => handleQuickFill(entry.locationKey)}
                        variant="outline"
                        size="sm"
                        className="custom-correction-button"
                      >
                        Create Correction
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 3: APPROVED TAXONOMY */}
      <div data-theme="light" className="bg-background rounded-lg shadow-lg p-6 mt-6">
        <div className="mb-6">
          <h2 className="text-[20px] font-bold mb-2 text-foreground">Approved Taxonomy</h2>
          <p className="text-muted-foreground">
            All approved location hierarchies currently available in the system.
          </p>
        </div>

        {approvedLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
          </div>
        ) : approvedData?.locations && approvedData.locations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Country
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    City
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Neighborhood
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    LocationKey
                  </th>
                </tr>
              </thead>
              <tbody className="bg-background divide-y divide-border">
                {approvedData.locations.map((location) => (
                  <tr key={location.locationKey} className="hover:bg-accent">
                    <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">
                      {location.country}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">
                      {location.city || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">
                      {location.neighborhood || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs bg-muted px-2 py-1 rounded text-foreground">
                        {location.locationKey}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">
            No approved taxonomy entries yet. Approve pending entries above to populate this list.
          </p>
        )}
      </div>
    </div>
  );
}
