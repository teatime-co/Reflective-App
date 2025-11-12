import { useEffect, useState } from 'react';
import { useConflictsStore } from '../stores/useConflictsStore';
import { ConflictDiffView } from '../components/ConflictDiffView';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { decryptConflict, formatTimestamp, getConflictPreview } from '../utils/conflictHelpers';
import type { DecryptedConflict } from '../../types/conflicts';
import { toast } from 'sonner';

export function ConflictListPage() {
  const {
    conflicts,
    selectedConflict,
    isLoading,
    error,
    fetchConflictsFromBackend,
    selectConflict,
    resolveConflict,
    clearError,
  } = useConflictsStore();

  const [decryptedConflict, setDecryptedConflict] = useState<DecryptedConflict | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const [mergedContent, setMergedContent] = useState('');

  useEffect(() => {
    fetchConflictsFromBackend();
  }, [fetchConflictsFromBackend]);

  useEffect(() => {
    if (selectedConflict) {
      setIsDecrypting(true);
      setMergeMode(false);
      setMergedContent('');
      setDecryptedConflict(null);

      decryptConflict(selectedConflict)
        .then(setDecryptedConflict)
        .catch((err) => {
          console.error('Failed to decrypt conflict:', err);
          toast.error('Failed to decrypt conflict content');
        })
        .finally(() => setIsDecrypting(false));
    }
  }, [selectedConflict]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const handleKeepLocal = async () => {
    if (!selectedConflict) return;

    const success = await resolveConflict(selectedConflict.id, 'local');
    if (success) {
      toast.success('Kept your local version');
      setDecryptedConflict(null);
    }
  };

  const handleKeepRemote = async () => {
    if (!selectedConflict) return;

    const success = await resolveConflict(selectedConflict.id, 'remote');
    if (success) {
      toast.success('Kept server version');
      setDecryptedConflict(null);
    }
  };

  const handleMerge = async () => {
    if (!selectedConflict || !mergedContent.trim()) {
      toast.error('Please enter merged content');
      return;
    }

    const success = await resolveConflict(selectedConflict.id, 'merged', mergedContent);
    if (success) {
      toast.success('Merged version saved');
      setDecryptedConflict(null);
      setMergeMode(false);
      setMergedContent('');
    }
  };

  const handleStartMerge = () => {
    if (decryptedConflict) {
      setMergeMode(true);
      setMergedContent(decryptedConflict.localVersion.content);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Loading conflicts...</p>
        </div>
      </div>
    );
  }

  if (conflicts.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Conflicts</CardTitle>
            <CardDescription>
              All your journal entries are synced successfully. Conflicts will appear here when the same
              entry is modified on different devices.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-80 border-r bg-muted/10">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">Sync Conflicts</h2>
          <p className="text-sm text-muted-foreground">{conflicts.length} pending</p>
        </div>
        <div className="overflow-y-auto">
          {conflicts.map((conflict) => (
            <button
              key={conflict.id}
              onClick={() => selectConflict(conflict.id)}
              className={`w-full border-b p-4 text-left transition-colors hover:bg-muted/50 ${
                selectedConflict?.id === conflict.id ? 'bg-muted' : ''
              }`}
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium">
                    Entry {conflict.logId.substring(0, 8)}...
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {getConflictPreview(conflict.localVersion.encryptedContent)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatTimestamp(conflict.detectedAt)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!selectedConflict ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p>Select a conflict to view details</p>
          </div>
        ) : isDecrypting ? (
          <div className="flex h-full items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !decryptedConflict ? (
          <div className="flex h-full items-center justify-center text-destructive">
            <p>Failed to decrypt conflict</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Resolve Sync Conflict</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                This entry was modified on different devices. Choose which version to keep or manually merge them.
              </p>
            </div>

            {!mergeMode ? (
              <>
                <ConflictDiffView
                  localVersion={decryptedConflict.localVersion}
                  remoteVersion={decryptedConflict.remoteVersion}
                />

                <div className="flex gap-3">
                  <Button onClick={handleKeepLocal} variant="outline" className="flex-1">
                    Keep My Version
                  </Button>
                  <Button onClick={handleKeepRemote} variant="outline" className="flex-1">
                    Keep Server Version
                  </Button>
                  <Button onClick={handleStartMerge} className="flex-1">
                    Merge Manually
                  </Button>
                </div>
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Manual Merge</CardTitle>
                  <CardDescription>
                    Edit the content below to create a merged version. This will be saved as the final version.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={mergedContent}
                    onChange={(e) => setMergedContent(e.target.value)}
                    placeholder="Enter merged content..."
                    className="min-h-[400px] font-mono text-sm"
                  />
                  <div className="flex gap-3">
                    <Button onClick={() => setMergeMode(false)} variant="outline">
                      Cancel
                    </Button>
                    <Button onClick={handleMerge} disabled={!mergedContent.trim()}>
                      Save Merged Version
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
