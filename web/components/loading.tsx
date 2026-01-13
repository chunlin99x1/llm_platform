import { Suspense } from 'react';

interface LoadingSpinnerProps {
    message?: string;
}

/**
 * Loading component for Suspense fallback
 */
export function LoadingSpinner({ message = "加载中..." }: LoadingSpinnerProps) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-background">
            <div className="relative flex h-12 w-12 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                <div className="h-8 w-8 animate-pulse rounded-lg bg-primary shadow-md shadow-primary/30 flex items-center justify-center">
                    <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                </div>
            </div>
            <div className="text-[11px] font-medium text-foreground animate-pulse uppercase tracking-wider">
                {message}
            </div>
        </div>
    );
}

/**
 * Page-level loading skeleton
 */
export function PageSkeleton() {
    return (
        <div className="flex h-screen flex-col">
            {/* Header skeleton */}
            <div className="h-14 bg-content2/50 animate-pulse" />

            {/* Main content skeleton */}
            <div className="flex-1 flex gap-4 p-4">
                <div className="w-80 bg-content2/30 rounded-lg animate-pulse" />
                <div className="flex-1 bg-content2/30 rounded-lg animate-pulse" />
            </div>
        </div>
    );
}
