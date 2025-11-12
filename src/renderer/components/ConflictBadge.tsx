import { Badge } from './ui/badge';

interface ConflictBadgeProps {
  count: number;
}

export function ConflictBadge({ count }: ConflictBadgeProps) {
  if (count === 0) {
    return null;
  }

  return (
    <Badge
      variant="destructive"
      className="ml-auto h-5 min-w-[20px] px-1.5 text-xs font-medium"
    >
      {count}
    </Badge>
  );
}
