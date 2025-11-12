import { useMemo } from 'react';
import { diffWords, Change } from 'diff';
import type { DecryptedConflictVersion } from '../../types/conflicts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { formatTimestamp, formatDeviceId } from '../utils/conflictHelpers';

interface ConflictDiffViewProps {
  localVersion: DecryptedConflictVersion;
  remoteVersion: DecryptedConflictVersion;
}

export function ConflictDiffView({ localVersion, remoteVersion }: ConflictDiffViewProps) {
  const diff = useMemo(() => {
    return diffWords(localVersion.content, remoteVersion.content);
  }, [localVersion.content, remoteVersion.content]);

  const renderDiffContent = (changes: Change[], showLocal: boolean) => {
    return changes.map((part, index) => {
      if (showLocal && part.added) {
        return null;
      }
      if (!showLocal && part.removed) {
        return null;
      }

      const className = part.added
        ? 'bg-green-100 dark:bg-green-900/30'
        : part.removed
        ? 'bg-red-100 dark:bg-red-900/30 line-through'
        : '';

      return (
        <span key={index} className={className}>
          {part.value}
        </span>
      );
    });
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your Version (Local)</CardTitle>
          <CardDescription className="flex flex-col gap-1 text-xs">
            <span>Modified: {formatTimestamp(localVersion.updatedAt)}</span>
            <span>Device: {formatDeviceId(localVersion.deviceId)}</span>
            <span>Words: {localVersion.wordCount}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {renderDiffContent(diff, true)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Server Version (Remote)</CardTitle>
          <CardDescription className="flex flex-col gap-1 text-xs">
            <span>Modified: {formatTimestamp(remoteVersion.updatedAt)}</span>
            <span>Device: {formatDeviceId(remoteVersion.deviceId)}</span>
            <span>Words: {remoteVersion.wordCount}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {renderDiffContent(diff, false)}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="col-span-2 flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm dark:border-yellow-900 dark:bg-yellow-900/20">
        <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
          Added
        </Badge>
        <span className="text-muted-foreground">New content in this version</span>
        <Badge variant="outline" className="ml-4 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
          Removed
        </Badge>
        <span className="text-muted-foreground">Content removed from this version</span>
      </div>
    </div>
  );
}
