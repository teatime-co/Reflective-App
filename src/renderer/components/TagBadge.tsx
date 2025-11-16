import { X } from 'lucide-react';
import { memo, useMemo } from 'react';
import type { Tag } from '../../types/database';

interface TagBadgeProps {
  tag: Tag;
  onRemove?: () => void;
  onClick?: () => void;
}

export const TagBadge = memo(function TagBadge({ tag, onRemove, onClick }: TagBadgeProps) {
  const style = useMemo(() => ({ backgroundColor: tag.color, color: '#fff' }), [tag.color]);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
      style={style}
      onClick={onClick}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:bg-black/20 rounded-full p-0.5 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
});
