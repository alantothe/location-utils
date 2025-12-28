import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  usePreviewTaxonomyCorrection,
  useCreateTaxonomyCorrection,
} from "@client/shared/services/api/hooks";
import { Button } from "@client/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@client/components/ui/alert-dialog";
import { FormInput, FormSelect } from "@client/shared/components/forms";
import { SelectItem } from "@client/components/ui/select";
import { formatLocationHierarchy } from "@client/shared/lib/utils";
import type { TaxonomyCorrectionRequest } from "@client/shared/services/api/types";

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

interface CorrectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: {
    incorrect_value: string;
    part_type: "country" | "city" | "neighborhood";
  };
}

export function CorrectionModal({ open, onOpenChange, defaultValues }: CorrectionModalProps) {
  const [showPreview, setShowPreview] = useState(false);

  const { control, handleSubmit, reset, getValues, trigger } = useForm<CorrectionFormData>({
    resolver: zodResolver(correctionSchema),
    defaultValues: defaultValues || {
      incorrect_value: "",
      correct_value: "",
      part_type: "city",
    },
  });

  const previewMutation = usePreviewTaxonomyCorrection();
  const createMutation = useCreateTaxonomyCorrection();

  const handlePreview = async () => {
    const isValid = await trigger();
    if (!isValid) return;

    const values = getValues();
    previewMutation.mutate(values as TaxonomyCorrectionRequest, {
      onSuccess: () => {
        setShowPreview(true);
      },
    });
  };

  const onSubmit = async (data: CorrectionFormData) => {
    createMutation.mutate(data as TaxonomyCorrectionRequest, {
      onSuccess: (result) => {
        // Success feedback
        alert(`Correction applied! Updated ${result.updatedPendingCount} pending entries and ${result.updatedLocationCount} locations.`);
        onOpenChange(false);
        reset();
        setShowPreview(false);
      },
      onError: (error) => {
        console.error("Failed to create correction:", error);
        alert("Failed to create correction. Please try again.");
      },
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    reset();
    setShowPreview(false);
    previewMutation.reset();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Create Taxonomy Correction</AlertDialogTitle>
          <AlertDialogDescription>
            Define a rule to fix malformed location data. This will update existing data.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
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
          </div>

          {/* Preview Section */}
          {showPreview && previewMutation.data && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Impact Preview</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>
                  <strong>{previewMutation.data.pendingTaxonomyCount}</strong> pending taxonomy entries will be updated
                </p>
                <p>
                  <strong>{previewMutation.data.locationCount}</strong> locations will be updated
                </p>

                {previewMutation.data.pendingTaxonomySamples.length > 0 && (
                  <div className="mt-3">
                    <p className="font-medium mb-1">Sample pending entries:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {previewMutation.data.pendingTaxonomySamples.slice(0, 3).map((key) => (
                        <li key={key} className="text-xs font-mono">
                          {formatLocationHierarchy(key)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {previewMutation.data.locationSamples.length > 0 && (
                  <div className="mt-3">
                    <p className="font-medium mb-1">Sample locations:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {previewMutation.data.locationSamples.slice(0, 3).map((sample) => (
                        <li key={sample.id} className="text-xs">
                          {sample.name}: <code className="bg-red-100 px-1 rounded">{sample.currentKey}</code> → <code className="bg-green-100 px-1 rounded">{sample.correctedKey}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleClose}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              onClick={handlePreview}
              disabled={previewMutation.isPending}
            >
              {previewMutation.isPending ? "Loading..." : "Preview Impact"}
            </Button>
            <Button
              type="submit"
              disabled={!showPreview || createMutation.isPending}
            >
              {createMutation.isPending ? "Applying..." : "Create & Apply"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
