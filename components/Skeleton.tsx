import React from 'react';

export const Skeleton: React.FC<{
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
}> = ({ className = '', variant = 'text', width, height }) => {
    const baseClasses = "animate-pulse bg-slate-200 rounded";
    const variantClasses = {
        text: "h-4 w-full",
        circular: "rounded-full",
        rectangular: "h-full w-full",
    };

    const style = {
        width: width,
        height: height,
    };

    return (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            style={style}
        />
    );
};

export const SkeletonCard: React.FC = () => (
    <div className="p-4 border border-slate-200 rounded-lg shadow-sm space-y-3 bg-white">
        <div className="flex items-center space-x-3">
            <Skeleton variant="circular" width={40} height={40} />
            <div className="space-y-2 flex-1">
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="40%" />
            </div>
        </div>
        <div className="space-y-2">
            <Skeleton variant="text" />
            <Skeleton variant="text" />
        </div>
    </div>
);

export const SkeletonRow: React.FC = () => (
    <div className="flex items-center space-x-4 py-3 px-4 border-b border-slate-100">
        <Skeleton variant="text" width={30} />
        <div className="flex-1 space-y-1">
            <Skeleton variant="text" width="50%" />
            <Skeleton variant="text" width="30%" />
        </div>
        <Skeleton variant="rectangular" width={50} height={24} className="rounded-full" />
    </div>
);
