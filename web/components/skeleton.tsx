/**
 * Skeleton Loading 组件集合
 */

import React from 'react';

interface SkeletonProps {
    className?: string;
    width?: string | number;
    height?: string | number;
}

/**
 * 基础 Skeleton 组件
 */
export function Skeleton({ className = '', width, height }: SkeletonProps) {
    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;

    return (
        <div
            className={`animate-pulse bg-content2/60 rounded ${className}`}
            style={style}
        />
    );
}

/**
 * 文本行 Skeleton
 */
export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    height={12}
                    width={i === lines - 1 ? '60%' : '100%'}
                />
            ))}
        </div>
    );
}

/**
 * 卡片 Skeleton
 */
export function SkeletonCard({ className = '' }: { className?: string }) {
    return (
        <div className={`p-4 rounded-xl bg-content2/30 space-y-3 ${className}`}>
            <div className="flex items-center gap-3">
                <Skeleton width={40} height={40} className="rounded-lg" />
                <div className="flex-1 space-y-2">
                    <Skeleton height={14} width="40%" />
                    <Skeleton height={10} width="60%" />
                </div>
            </div>
            <SkeletonText lines={2} />
        </div>
    );
}

/**
 * 列表 Skeleton
 */
export function SkeletonList({ count = 3, className = '' }: { count?: number; className?: string }) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton width={32} height={32} className="rounded-lg" />
                    <div className="flex-1 space-y-1">
                        <Skeleton height={12} width="50%" />
                        <Skeleton height={10} width="30%" />
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * 表格 Skeleton
 */
export function SkeletonTable({ rows = 5, cols = 4, className = '' }: { rows?: number; cols?: number; className?: string }) {
    return (
        <div className={`space-y-2 ${className}`}>
            {/* Header */}
            <div className="flex gap-4 p-3 bg-content2/40 rounded-lg">
                {Array.from({ length: cols }).map((_, i) => (
                    <Skeleton key={i} height={14} className="flex-1" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex gap-4 p-3">
                    {Array.from({ length: cols }).map((_, colIndex) => (
                        <Skeleton key={colIndex} height={12} className="flex-1" />
                    ))}
                </div>
            ))}
        </div>
    );
}

/**
 * 页面级 Skeleton
 */
export function PageSkeleton() {
    return (
        <div className="flex h-screen flex-col">
            {/* Header */}
            <div className="h-14 border-b border-divider flex items-center px-4 gap-4">
                <Skeleton width={32} height={32} className="rounded-lg" />
                <Skeleton width={120} height={20} />
                <div className="flex-1" />
                <Skeleton width={80} height={32} className="rounded-lg" />
            </div>

            {/* Main content */}
            <div className="flex-1 flex gap-4 p-4">
                {/* Sidebar */}
                <div className="w-80 space-y-4">
                    <SkeletonCard />
                    <SkeletonList count={4} />
                </div>
                {/* Content */}
                <div className="flex-1 space-y-4">
                    <Skeleton height={200} className="rounded-xl" />
                    <SkeletonText lines={4} />
                </div>
            </div>
        </div>
    );
}
