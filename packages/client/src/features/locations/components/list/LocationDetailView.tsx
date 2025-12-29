import type { LocationResponse } from "@client/shared/services/api/types";
import { truncateUrl } from "../../utils";
import { DetailField } from "./DetailField";
import { AddInstagramEmbedForm } from "../forms/AddInstagramEmbedForm";

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
              <ul className="space-y-1 ml-4">
                {locationDetail.instagram_embeds.map((embed) => (
                  <li key={embed.id}>
                    <span
                      className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer underline underline-offset-2 decoration-gray-400 hover:decoration-gray-600 transition-colors"
                      onClick={(e) => onCopyField(`@${embed.username}`, e)}
                      title="Click to copy Instagram username"
                    >
                      @{embed.username}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Uploads section */}
        {locationDetail.uploads && locationDetail.uploads.length > 0 && (
          <DetailField
            label="Images"
            value={`${locationDetail.uploads.length} image${locationDetail.uploads.length !== 1 ? 's' : ''} uploaded`}
            valueClassName="text-sm text-gray-600"
          />
        )}
      </div>
    </div>
  );
}
