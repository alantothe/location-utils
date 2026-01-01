import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormInput } from "@client/shared/components/forms";
import { Button } from "@client/components/ui/button";
import { useToast } from "@client/shared/hooks/useToast";
import { useAddUploadImageSet } from "@client/shared/services/api/hooks/useAddUploadImageSet";
import { ImagePreviewGrid } from "../ui/ImagePreviewGrid";
import { MultiVariantCropperModal } from "../modals/MultiVariantCropperModal";
import { Upload } from "lucide-react";
import {
  addUploadFilesSchema,
  type AddUploadFilesFormData,
} from "../../validation/add-upload-files.schema";
import type { ImageVariantType } from "@url-util/shared";

interface AddUploadFilesFormProps {
  locationId: number;
}

interface ProcessedImageSet {
  sourceFile: File;
  variantFiles: { type: ImageVariantType; file: File }[];
}

export function AddUploadFilesForm({ locationId }: AddUploadFilesFormProps) {
  const { showToast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processedImageSets, setProcessedImageSets] = useState<(ProcessedImageSet | null)[]>([]);
  const [cropModalState, setCropModalState] = useState<{
    isOpen: boolean;
    fileIndex: number | null;
  }>({ isOpen: false, fileIndex: null });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<AddUploadFilesFormData>({
    resolver: zodResolver(addUploadFilesSchema),
    defaultValues: {
      photographerCredit: "",
    },
  });

  const { mutate, isPending, uploadProgress } = useAddUploadImageSet(locationId, {
    onSuccess: () => {
      const centerPosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      showToast(`Image set uploaded successfully (5 variants)`, centerPosition);
      handleReset();
    },
    onError: (error) => {
      const centerPosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      showToast(error.message || "Failed to upload image set", centerPosition);
    },
  });

  function handleFileSelect(files: FileList | null) {
    if (!files) return;
    const fileArray = Array.from(files);
    const startIndex = selectedFiles.length;

    setSelectedFiles((prev) => [...prev, ...fileArray]);
    setProcessedImageSets((prev) => [...prev, ...new Array(fileArray.length).fill(null)]);

    // Auto-open first new file for cropping (multi-variant)
    setCropModalState({ isOpen: true, fileIndex: startIndex });
  }

  function handleRemoveFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setProcessedImageSets((prev) => prev.filter((_, i) => i !== index));

    // If modal was open for this file, close it
    if (cropModalState.fileIndex === index) {
      setCropModalState({ isOpen: false, fileIndex: null });
    }
  }

  function handleReset() {
    setSelectedFiles([]);
    setProcessedImageSets([]);
    setCropModalState({ isOpen: false, fileIndex: null });
    form.reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleSubmit(data: AddUploadFilesFormData) {
    if (!areAllFilesCropped()) return;

    // Currently only supporting 1 image set per upload
    // Can be extended to support multiple in the future
    const imageSet = processedImageSets[0];
    if (!imageSet) return;

    mutate({
      sourceFile: imageSet.sourceFile,
      variantFiles: imageSet.variantFiles,
      photographerCredit: data.photographerCredit || undefined,
    });
  }

  // Cropping workflow handlers
  function handleCropImage(index: number) {
    setCropModalState({ isOpen: true, fileIndex: index });
  }

  function handleCropConfirm(
    sourceFile: File,
    variantFiles: { type: ImageVariantType; file: File }[]
  ) {
    if (cropModalState.fileIndex === null) return;

    setProcessedImageSets((prev) => {
      const updated = [...prev];
      updated[cropModalState.fileIndex!] = { sourceFile, variantFiles };
      return updated;
    });

    // Auto-open next uncropped file
    const nextUncropped = findNextUncroppedIndex(cropModalState.fileIndex + 1);
    if (nextUncropped !== null) {
      setCropModalState({ isOpen: true, fileIndex: nextUncropped });
    } else {
      setCropModalState({ isOpen: false, fileIndex: null });
    }
  }

  function findNextUncroppedIndex(startIndex: number): number | null {
    for (let i = startIndex; i < selectedFiles.length; i++) {
      if (!processedImageSets[i]) return i;
    }
    return null;
  }

  function areAllFilesCropped(): boolean {
    return (
      selectedFiles.length > 0 &&
      selectedFiles.every((_, i) => processedImageSets[i] !== null)
    );
  }

  // Drag and drop handlers
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  }

  return (
    <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
      <h4 className="text-sm font-semibold text-foreground">Add Images</h4>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
        {/* Drag and drop zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 mb-2">
            Drag and drop images here, or click to select
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
          >
            Choose Files
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            {selectedFiles.length} file(s) selected
          </p>
        </div>

        {/* Image preview grid */}
        {selectedFiles.length > 0 && (
          <ImagePreviewGrid
            files={selectedFiles}
            onRemove={handleRemoveFile}
            onCrop={handleCropImage}
            croppedIndicators={processedImageSets.map((set) => set !== null)}
          />
        )}

        {/* Photographer credit */}
        <FormInput
          control={form.control}
          name="photographerCredit"
          label="Photographer Credit (optional)"
          placeholder="Name, studio, or publication"
        />

        {/* Progress bar */}
        {isPending && uploadProgress > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={isPending || !areAllFilesCropped()}
            size="sm"
          >
            {isPending
              ? `Uploading... ${uploadProgress}%`
              : areAllFilesCropped()
                ? "Upload Image Set (5 variants)"
                : `Crop ${selectedFiles.length - processedImageSets.filter(Boolean).length} more image(s)`}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isPending}
            size="sm"
          >
            Clear
          </Button>
        </div>
      </form>

      {/* Multi-variant crop modal */}
      {cropModalState.isOpen && cropModalState.fileIndex !== null && (
        <MultiVariantCropperModal
          file={selectedFiles[cropModalState.fileIndex]}
          isOpen={cropModalState.isOpen}
          onClose={() => setCropModalState({ isOpen: false, fileIndex: null })}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}
