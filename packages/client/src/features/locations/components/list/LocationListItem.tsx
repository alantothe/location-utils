import { useState } from "react";
import { formatLocationHierarchy } from "@client/shared/lib/utils";
import { useLocationDetail } from "../../hooks";
import { useToast } from "@client/shared/hooks/useToast";

interface LocationListItemProps {
  location: {
    id: number;
    name: string;
    category: string;
    location?: string;
  };
  onClick?: (id: number) => void;
}

export function LocationListItem({ location, onClick }: LocationListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: locationDetail, isLoading, error } = useLocationDetail(isExpanded ? location.id : null);
  const { showToast } = useToast();

  const handleClick = () => {
    if (onClick) {
      onClick(location.id);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const handleCopyField = async (value: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the expand/collapse

    try {
      await navigator.clipboard.writeText(value);
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      showToast('Copied', {
        x: rect.right,
        y: rect.top + rect.height / 2, // Position to the right, vertically centered
      });
    } catch (error) {
      console.error('Failed to copy text: ', error);
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-white transition-all duration-200 hover:shadow-sm hover:border-gray-400">
      {/* Header Section */}
      <div
        className="flex items-start justify-between gap-3 cursor-pointer"
        onClick={handleClick}
      >
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 text-base leading-tight truncate">
            {location.name}
          </h3>
          {location.location && (
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">
              {formatLocationHierarchy(location.location)}
            </p>
          )}
        </div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-1 bg-gray-50 rounded-md flex-shrink-0">
          {location.category}
        </span>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {isLoading && (
            <p className="text-sm text-gray-600">Loading details...</p>
          )}

          {error && (
            <p className="text-sm text-red-600">
              Error loading details: {error.message}
            </p>
          )}

          {locationDetail && (
            <div className="space-y-3">
              {locationDetail.title && locationDetail.title !== locationDetail.source?.name && (
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-fit">
                    Title:
                  </span>
                  <span className="text-sm text-gray-900">{locationDetail.title}</span>
                </div>
              )}

              {locationDetail.source?.address && (
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-fit">
                    Address:
                  </span>
                  <span
                    className="text-sm text-gray-900 leading-relaxed cursor-pointer underline underline-offset-2 decoration-gray-400 hover:decoration-gray-600 transition-colors"
                    onClick={(e) => handleCopyField(locationDetail.source!.address!, e)}
                    title="Click to copy address"
                  >
                    {locationDetail.source.address}
                  </span>
                </div>
              )}

              {locationDetail.contact?.phoneNumber && (
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-fit">
                    Phone:
                  </span>
                  <span
                    className="text-sm text-gray-900 cursor-pointer underline underline-offset-2 decoration-gray-400 hover:decoration-gray-600 transition-colors"
                    onClick={(e) => handleCopyField(locationDetail.contact!.phoneNumber!, e)}
                    title="Click to copy phone number"
                  >
                    {locationDetail.contact.phoneNumber}
                  </span>
                </div>
              )}

              {locationDetail.contact?.website && (
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-fit">
                    Website:
                  </span>
                  <span
                    className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer underline underline-offset-2 decoration-gray-400 hover:decoration-gray-600 transition-colors"
                    onClick={(e) => handleCopyField(locationDetail.contact!.website!, e)}
                    title="Click to copy website URL"
                  >
                    {locationDetail.contact.website}
                  </span>
                </div>
              )}

              {locationDetail.coordinates?.lat && locationDetail.coordinates?.lng && (
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-fit">
                    Coordinates:
                  </span>
                  <div className="flex gap-1 items-baseline">
                    <span
                      className="text-sm text-gray-900 font-mono cursor-pointer underline underline-offset-2 decoration-gray-400 hover:decoration-gray-600 transition-colors"
                      onClick={(e) => handleCopyField(locationDetail.coordinates?.lat?.toString() || '', e)}
                      title="Click to copy latitude"
                    >
                      {locationDetail.coordinates.lat}
                    </span>
                    <span className="text-sm text-gray-500">, </span>
                    <span
                      className="text-sm text-gray-900 font-mono cursor-pointer underline underline-offset-2 decoration-gray-400 hover:decoration-gray-600 transition-colors"
                      onClick={(e) => handleCopyField(locationDetail.coordinates?.lng?.toString() || '', e)}
                      title="Click to copy longitude"
                    >
                      {locationDetail.coordinates.lng}
                    </span>
                  </div>
                </div>
              )}

              {locationDetail.instagram_embeds?.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Instagram Posts:
                  </span>
                  <ul className="space-y-1 ml-4">
                    {locationDetail.instagram_embeds.map((embed) => (
                      <li key={embed.id}>
                        <span
                          className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer underline underline-offset-2 decoration-gray-400 hover:decoration-gray-600 transition-colors"
                          onClick={(e) => handleCopyField(`@${embed.username}`, e)}
                          title="Click to copy Instagram username"
                        >
                          @{embed.username}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {locationDetail.uploads?.length > 0 && (
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-fit">
                    Images:
                  </span>
                  <span className="text-sm text-gray-600">
                    {locationDetail.uploads.length} image{locationDetail.uploads.length !== 1 ? 's' : ''} uploaded
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
