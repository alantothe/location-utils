import { useState, useMemo } from "react";
import { useSyncStatus, useSyncLocation, useSyncAll, usePayloadConnection } from "@client/shared/services/api/hooks/usePayloadSync";
import { Button } from "@client/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/components/ui/select";
import type { Category } from "@client/shared/services/api/types";
import type { SyncStatusResponse } from "@client/shared/services/api/payload.api";

type SyncStatusFilter = "all" | "synced" | "not-synced" | "failed";

export function PayloadSync() {
  const { data: statusData, isLoading, error } = useSyncStatus();
  const syncLocationMutation = useSyncLocation();
  const syncAllMutation = useSyncAll();
  const { data: connectionStatus, isLoading: isConnecting, refetch: testConnection } = usePayloadConnection();

  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
  const [statusFilter, setStatusFilter] = useState<SyncStatusFilter>("all");

  // Filter status data by category and sync status
  const filteredData = useMemo(() => {
    if (!statusData) return [];

    let filtered = statusData;

    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Filter by sync status
    if (statusFilter === "synced") {
      filtered = filtered.filter(item => item.synced && item.syncState?.sync_status === "success");
    } else if (statusFilter === "not-synced") {
      filtered = filtered.filter(item => !item.synced);
    } else if (statusFilter === "failed") {
      filtered = filtered.filter(item => item.syncState?.sync_status === "failed");
    }

    return filtered;
  }, [statusData, categoryFilter, statusFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!statusData) return { total: 0, synced: 0, failed: 0, notSynced: 0 };

    const total = statusData.length;
    const synced = statusData.filter(item => item.synced && item.syncState?.sync_status === "success").length;
    const failed = statusData.filter(item => item.syncState?.sync_status === "failed").length;
    const notSynced = statusData.filter(item => !item.synced).length;

    return { total, synced, failed, notSynced };
  }, [statusData]);

  const handleSyncLocation = async (locationId: number) => {
    setSyncingId(locationId);
    try {
      await syncLocationMutation.mutateAsync(locationId);
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAll = async () => {
    const category = categoryFilter !== "all" ? categoryFilter : undefined;
    await syncAllMutation.mutateAsync(category);
  };

  const getSyncStatusBadge = (item: SyncStatusResponse) => {
    if (!item.syncState) {
      return <span className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700">Not Synced</span>;
    }

    if (item.syncState.sync_status === "success") {
      return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">Synced</span>;
    }

    if (item.syncState.sync_status === "failed") {
      return <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700">Failed</span>;
    }

    if (item.syncState.sync_status === "pending") {
      return <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700">Pending</span>;
    }

    return null;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div data-theme="light" className="bg-background rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-[24px] font-bold mb-2 text-foreground underline">
            Payload CMS Sync
          </h2>
          <p className="text-muted-foreground">
            Sync location data from url-util to Payload CMS. Images are uploaded to Bunny CDN via Payload.
          </p>
        </div>

        {/* Connection Status */}
        <div className="mb-6">
          {isConnecting ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-yellow-700">🟡 Connecting to Payload...</span>
              </div>
            </div>
          ) : connectionStatus?.connected ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-green-700">🟢 Connected to Payload CMS</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => testConnection()}>
                Test Again
              </Button>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-red-700 font-medium">🔴 Not Connected</span>
                <Button variant="outline" size="sm" onClick={() => testConnection()}>
                  Retry Connection
                </Button>
              </div>
              {connectionStatus?.error && (
                <p className="text-sm text-red-600 mt-2">{connectionStatus.error}</p>
              )}
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-muted p-4 rounded">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Locations</div>
          </div>
          <div className="bg-green-50 p-4 rounded">
            <div className="text-2xl font-bold text-green-700">{stats.synced}</div>
            <div className="text-sm text-green-600">Synced</div>
          </div>
          <div className="bg-red-50 p-4 rounded">
            <div className="text-2xl font-bold text-red-700">{stats.failed}</div>
            <div className="text-sm text-red-600">Failed</div>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <div className="text-2xl font-bold text-gray-700">{stats.notSynced}</div>
            <div className="text-sm text-gray-600">Not Synced</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Category Filter</label>
            <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as Category | "all")}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="dining">Dining</SelectItem>
                <SelectItem value="accommodations">Accommodations</SelectItem>
                <SelectItem value="attractions">Attractions</SelectItem>
                <SelectItem value="nightlife">Nightlife</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Sync Status Filter</label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as SyncStatusFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="synced">Synced</SelectItem>
                <SelectItem value="not-synced">Not Synced</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={handleSyncAll}
              disabled={syncAllMutation.isPending}
              className="w-full"
            >
              {syncAllMutation.isPending ? "Syncing..." : "Sync All"}
            </Button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
            <p className="font-medium">Error loading sync status</p>
            <p className="text-sm">Please try again later.</p>
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground"></div>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No locations found matching the selected filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Last Synced
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Payload Doc ID
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-background divide-y divide-border">
                {filteredData.map((item) => (
                  <tr key={item.locationId} className="hover:bg-accent">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {item.locationId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                      {item.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground capitalize">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getSyncStatusBadge(item)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {item.syncState?.last_synced_at
                        ? formatDate(item.syncState.last_synced_at)
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground font-mono">
                      {item.syncState?.payload_doc_id || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Button
                        onClick={() => handleSyncLocation(item.locationId)}
                        disabled={syncingId === item.locationId}
                        variant="outline"
                        size="sm"
                      >
                        {syncingId === item.locationId ? "Syncing..." : "Sync"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Error messages for failed syncs */}
        {filteredData.some(item => item.syncState?.error_message) && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Error Details</h3>
            <div className="space-y-2">
              {filteredData
                .filter(item => item.syncState?.error_message)
                .map(item => (
                  <div key={item.locationId} className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                    <p className="font-medium">Location #{item.locationId}: {item.title}</p>
                    <p className="text-sm">{item.syncState?.error_message}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
