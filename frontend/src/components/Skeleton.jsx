import React from 'react';

export const Skeleton = ({ className }) => (
  <div className={`skeleton ${className}`}></div>
);

export const SkeletonCard = ({ rows = 3 }) => (
  <div className="skeleton-card p-4 space-y-4">
    <div className="flex justify-between items-start">
      <Skeleton className="h-4 w-3/4 rounded" />
      <Skeleton className="h-4 w-4 rounded-full" />
    </div>
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={`h-2 rounded ${i === rows - 1 ? 'w-1/2' : 'w-full'}`} />
      ))}
    </div>
    <div className="flex justify-between items-center pt-2">
      <Skeleton className="h-3 w-16 rounded" />
      <Skeleton className="h-5 w-5 rounded-full" />
    </div>
  </div>
);

export const BoardSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in duration-500">
    {['Planned', 'In Progress', 'Testing', 'Done'].map(col => (
      <div key={col} className="flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>
        {[1, 2].map(i => <SkeletonCard key={i} />)}
      </div>
    ))}
  </div>
);
