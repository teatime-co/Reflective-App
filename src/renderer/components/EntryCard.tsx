import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TagBadge } from './TagBadge';
import type { Entry, Tag } from '../../types/database';

interface EntryCardProps {
  entry: Entry;
  tags?: Tag[];
  onClick?: () => void;
}

export function EntryCard({ entry, tags = [], onClick }: EntryCardProps) {
  const excerpt = entry.content.substring(0, 150);
  const hasMore = entry.content.length > 150;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-slate-500">
            {format(new Date(entry.created_at), 'MMM dd, yyyy • h:mm a')}
          </CardTitle>
          <span className="text-xs text-slate-400">{entry.word_count} words</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-700 line-clamp-3">
          {excerpt}
          {hasMore && '...'}
        </p>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
