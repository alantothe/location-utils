import { useState } from "react";
import type { LocationResponse, Upload } from "@client/shared/services/api/types";
import { truncateUrl } from "../../utils";
import { DetailField } from "./DetailField";
import { AddInstagramEmbedForm } from "../forms/AddInstagramEmbedForm";
import { AddUploadFilesForm } from "../forms/AddUploadFilesForm";
import { ImageLightbox } from "../ui/ImageLightbox";
import { Button } from "@client/components/ui/button";
import { X } from "lucide-react";
import { useToast } from "@client/shared/hooks/useToast";
import { useDeleteUpload } from "@client/shared/services/api/hooks/useDeleteUpload";

interface LocationDetailViewProps {
  locationDetail: LocationResponse | null | undefined;
  isLoading: boolean;
  error: Error | null;
  onCopyField: (value: string, e: React.MouseEvent) => void;
}

/**
 * Component for displaying expanded location details
 * Shows all location fields, Instagram embeds, and uploads
 */
export function LocationDetailView({ locationDetail, isLoading, error, onCopyField }: LocationDetailViewProps) {
  const { showToast } = useToast();
  const [lightboxState, setLightboxState] = useState({
    isOpen: false,
    images: [] as string[],
    currentIndex: 0,
    photographerCredit: undefined as string | undefined,
  });

  const deleteMutation = useDeleteUpload({
    locationId: locationDetail?.id || 0,
    onSuccess: () => {
      const centerPosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      showToast("Upload deleted successfully", centerPosition);
    },
    onError: (error) => {
      const centerPosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      showToast(error.message || "Failed to delete upload", centerPosition);
    },
  });

  function handleImageClick(upload: Upload, imageIndex: number) {
    setLightboxState({
      isOpen: true,
      images: upload.images || [],
      currentIndex: imageIndex,
      photographerCredit: upload.photographerCredit || undefined,
    });
  }

  function handleLightboxNext() {
    setLightboxState((prev) => ({
      ...prev,
      currentIndex: Math.min(prev.currentIndex + 1, prev.images.length - 1),
    }));
  }

  function handleLightboxPrevious() {
    setLightboxState((prev) => ({
      ...prev,
      currentIndex: Math.max(prev.currentIndex - 1, 0),
    }));
  }

  function handleDeleteUpload(uploadId: number) {
    if (confirm("Are you sure you want to delete this upload?")) {
      deleteMutation.mutate(uploadId);
    }
  }

  if (isLoading) {
    return (
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">Loading details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm text-red-600">
          Error loading details: {error.message}
        </p>
      </div>
    );
  }

  if (!locationDetail) {
    return null;
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <div className="space-y-3">
        {/* Title field - only show if different from source name */}
        {locationDetail.title && locationDetail.title !== locationDetail.source?.name && (
          <DetailField
            label="Title"
            value={locationDetail.title}
          />
        )}

        {/* Address field */}
        {locationDetail.source?.address && (
          <DetailField
            label="Address"
            value={locationDetail.source.address}
            onClick={(e) => onCopyField(locationDetail.source!.address!, e)}
            title="Click to copy address"
            valueClassName="text-sm text-gray-900 leading-relaxed cursor-pointer underline underline-offset-2 decoration-gray-400 hover:decoration-gray-600 transition-colors"
          />
        )}

        {/* Phone number field */}
        {locationDetail.contact?.phoneNumber && (
          <DetailField
            label="Phone"
            value={locationDetail.contact.phoneNumber}
            onClick={(e) => onCopyField(locationDetail.contact!.phoneNumber!, e)}
            title="Click to copy phone number"
          />
        )}

        {/* Website field */}
        {locationDetail.contact?.website && (
          <DetailField
            label="Website"
            value={locationDetail.contact.website}
            onClick={(e) => onCopyField(locationDetail.contact!.website!, e)}
            title="Click to copy website URL"
            valueClassName="text-sm text-blue-600 hover:text-blue-700 cursor-pointer underline underline-offset-2 decoration-gray-400 hover:decoration-gray-600 transition-colors"
          />
        )}

        {/* Google Maps URL field */}
        {locationDetail.contact?.url && (
          <DetailField
            label="Google URL"
            value={truncateUrl(locationDetail.contact.url)}
            onClick={(e) => onCopyField(locationDetail.contact.url, e)}
            title="Click to copy Google Maps URL"
            valueClassName="text-sm text-blue-600 hover:text-blue-700 cursor-pointer underline underline-offset-2 decoration-gray-400 hover:decoration-gray-600 transition-colors break-all"
          />
        )}

        {/* Coordinates field - special handling for lat/lng */}
        {locationDetail.coordinates?.lat && locationDetail.coordinates?.lng && (
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-fit">
              Coordinates:
            </span>
            <div className="flex gap-1 items-baseline">
              <span
                className="text-sm text-gray-900 font-mono cursor-pointer underline underline-offset-2 decoration-gray-400 hover:decoration-gray-600 transition-colors"
                onClick={(e) => onCopyField(locationDetail.coordinates?.lat?.toString() || '', e)}
                title="Click to copy latitude"
              >
                {locationDetail.coordinates.lat}
              </span>
              <span className="text-sm text-gray-500">, </span>
              <span
                className="text-sm text-gray-900 font-mono cursor-pointer underline underline-offset-2 decoration-gray-400 hover:decoration-gray-600 transition-colors"
                onClick={(e) => onCopyField(locationDetail.coordinates?.lng?.toString() || '', e)}
                title="Click to copy longitude"
              >
                {locationDetail.coordinates.lng}
              </span>
            </div>
          </div>
        )}

        {/* Instagram Section: Form + Embeds */}
        <div className="space-y-4">
          {/* Add Instagram Embed Form */}
          <AddInstagramEmbedForm locationId={locationDetail.id} />

          {/* Existing Instagram Embeds List */}
          {locationDetail.instagram_embeds && locationDetail.instagram_embeds.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Instagram Posts:
              </span>
              <ul className="flex gap-2 ml-4 flex-wrap">
                {locationDetail.instagram_embeds.map((embed) => {
                  // Get first image if available
                  const firstImage = embed.images?.[0];
                  const imageUrl = firstImage
                    ? `/api/images/${firstImage.replace(/^data\/images\//, '')}`
                    : null;

                  return (
                    <li key={embed.id}>
                      {/* Thumbnail icon */}
                      {imageUrl && (
                        <div className="shrink-0 w-[120px] h-[120px] overflow-hidden rounded bg-gray-100 hover:ring-2 ring-blue-400 transition-all">
                          <img
                            src={imageUrl}
                            alt="Instagram"
                            className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                            loading="lazy"
                            onClick={(e) => onCopyField(embed.embed_code, e)}
                            title="Click to copy Instagram embed code"
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Uploads Section: Form + Gallery */}
        <div className="space-y-4">
          {/* Add Upload Files Form */}
          <AddUploadFilesForm locationId={locationDetail.id} />

          {/* Existing Uploads Gallery */}
          {locationDetail.uploads && locationDetail.uploads.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Uploaded Images ({locationDetail.uploads.reduce((sum, u) => sum + (u.images?.length || 0), 0)}):
              </span>
              <ul className="flex gap-2 ml-4 flex-wrap">
                {locationDetail.uploads.flatMap((upload) =>
                  (upload.images || []).map((imagePath, idx) => {
                    const imageUrl = `/api/images/${imagePath.replace(/^data\/images\//, '')}`;
                    return (
                      <li key={`${upload.id}-${idx}`} className="relative group">
                        <div className="shrink-0 w-[120px] h-[120px] overflow-hidden rounded bg-gray-100 hover:ring-2 ring-blue-400 transition-all">
                          <img
                            src={imageUrl}
                            alt={upload.photographerCredit || "Uploaded image"}
                            className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                            loading="lazy"
                            onClick={() => handleImageClick(upload, idx)}
                            title={upload.photographerCredit || "Click to view"}
                          />
                        </div>
                        {/* Delete button */}
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteUpload(upload.id!)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Image Lightbox */}
      {lightboxState.isOpen && (
        <ImageLightbox
          images={lightboxState.images}
          currentIndex={lightboxState.currentIndex}
          isOpen={lightboxState.isOpen}
          onClose={() => setLightboxState({ ...lightboxState, isOpen: false })}
          onNext={handleLightboxNext}
          onPrevious={handleLightboxPrevious}
          photographerCredit={lightboxState.photographerCredit}
        />
      )}
    </div>
  );
}
