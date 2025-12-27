import { useState, useRef, useEffect } from "react";
import { Settings } from "lucide-react";
import { formatLocationHierarchy } from "@client/shared/lib/utils";
import { useLocationDetail } from "../../hooks";
import { useToast } from "@client/shared/hooks/useToast";
import { truncateUrl } from "../../utils";

function getCategoryBadgeStyles(category: string) {
  const categoryLower = category.toLowerCase();

  switch (categoryLower) {
    case 'accommodations':
      return 'bg-blue-50 text-slate-600';
    case 'nightlife':
      return 'bg-purple-50 text-slate-600';
    case 'dining':
      return 'bg-orange-50 text-slate-600';
    case 'attractions':
      return 'bg-green-50 text-slate-600';
    default:
      return 'bg-gray-50 text-slate-600';
  }
}

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { data: locationDetail, isLoading, error } = useLocationDetail(isExpanded ? location.id : null);
  const { showToast } = useToast();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        <div className="flex items-center gap-3 flex-shrink-0 relative" ref={menuRef}>
          <Settings
            size={16}
            className="text-black cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
          />
          {isMenuOpen && (
            <div className="absolute right-full mr-2 top-0 z-10 bg-white border border-gray-200 rounded py-0.5 min-w-[80px] max-h-[77px]">
              <button
                className="w-full text-left px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle edit action here
                }}
              >
                Edit
              </button>
              <button
                className="w-full text-left px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle delete action here
                }}
              >
                Delete
              </button>
            </div>
          )}
          <span className={`text-xs font-medium uppercase tracking-wider px-2 py-1 rounded-md ${getCategoryBadgeStyles(location.category)}`}>
            {location.category}
          </span>
        </div>
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

              {locationDetail.contact.url && (
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-fit">
                    Google URL:
                  </span>
                  <span
                    className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer underline underline-offset-2 decoration-gray-400 hover:decoration-gray-600 transition-colors break-all"
                    onClick={(e) => handleCopyField(locationDetail.contact.url, e)}
                    title="Click to copy Google Maps URL"
                  >
                    {truncateUrl(locationDetail.contact.url)}
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
