import { format } from 'date-fns';
import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TagBadge } from './TagBadge';
import type { Entry, Tag } from '../../types/database';
import { cn } from '../lib/utils';

interface EntryCardProps {
  entry: Entry;
  tags?: Tag[];
  onClick?: () => void;
  isVisited?: boolean;
}

export const EntryCard = memo(function EntryCard({ entry, tags = [], onClick }: EntryCardProps) {
  const { excerpt, hasMore } = useMemo(() => {
    const stripHtml = (html: string) => {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || '';
    };

    const text = stripHtml(entry.content);
    const excerptText = text.substring(0, 150);
    return {
      excerpt: excerptText,
      hasMore: text.length > 150
    };
  }, [entry.content]);

  const formattedDate = useMemo(
    () => format(new Date(entry.created_at), 'MMM dd, yyyy • h:mm a'),
    [entry.created_at]
  );

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        "active:scale-[0.98] active:shadow-sm"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-slate-500">
            {formattedDate}
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
});
