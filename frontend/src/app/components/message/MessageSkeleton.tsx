import { Skeleton } from "../ui/skeleton";

export function MessageSkeleton() {
  return (
    <div className="px-4 py-3 flex gap-3">
      <Skeleton className="w-10 h-10 rounded-full bg-gray-800" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24 bg-gray-800" />
          <Skeleton className="h-3 w-16 bg-gray-800" />
        </div>
        <Skeleton className="h-4 w-full bg-gray-800" />
        <Skeleton className="h-4 w-3/4 bg-gray-800" />
      </div>
    </div>
  );
}

export function MessageListSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto">
      {Array.from({ length: 5 }).map((_, i) => (
        <MessageSkeleton key={i} />
      ))}
    </div>
  );
}
