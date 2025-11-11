import React, { useEffect, useState } from 'react';
import { useSyncStore } from '../stores/useSyncStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Loader2, CloudOff, Cloud, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export function SyncIndicator() {
  const {
    isSyncing,
    lastSyncTime,
    error,
    pendingCount,
    failedCount,
    processQueue,
    getSyncStatus,
  } = useSyncStore();

  const { settings } = useSettingsStore();

  useEffect(() => {
    getSyncStatus();

    const interval = setInterval(() => {
      getSyncStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [getSyncStatus]);

  const handleManualSync = async () => {
    await processQueue();
  };

  const formatLastSyncTime = (timestamp: number | null) => {
    if (!timestamp) return 'Never';

    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  if (!settings || settings.privacyTier === 'local_only') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500">
        <CloudOff className="h-4 w-4" />
        <span>Local only</span>
      </div>
    );
  }

  const getSyncIcon = () => {
    if (isSyncing) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (error || failedCount > 0) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (pendingCount === 0) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    return <Cloud className="h-4 w-4 text-blue-500" />;
  };

  const getSyncStatus = () => {
    if (isSyncing) return 'Syncing...';
    if (error) return 'Sync error';
    if (failedCount > 0) return `${failedCount} failed`;
    if (pendingCount === 0) return 'Synced';
    return `${pendingCount} pending`;
  };

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 border-t">
      <div className="flex items-center gap-2 text-sm">
        {getSyncIcon()}
        <span className="text-gray-700">{getSyncStatus()}</span>
      </div>

      {pendingCount > 0 && (
        <Badge variant="secondary" className="text-xs">
          {pendingCount}
        </Badge>
      )}

      {failedCount > 0 && (
        <Badge variant="destructive" className="text-xs">
          {failedCount} failed
        </Badge>
      )}

      <div className="flex-1" />

      <span className="text-xs text-gray-500">
        {formatLastSyncTime(lastSyncTime)}
      </span>

      <Button
        size="sm"
        variant="ghost"
        onClick={handleManualSync}
        disabled={isSyncing || pendingCount === 0}
        className="h-7 px-2"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
}
