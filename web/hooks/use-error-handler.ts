import { useState, useEffect, useCallback } from 'react';

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Hook for error handling with reset capability
 * @returns Object containing error state and reset function
 */
export function useErrorHandler() {
    const [error, setError] = useState<Error | null>(null);

    const resetError = useCallback(() => {
        setError(null);
    }, []);

    const handleError = useCallback((error: Error) => {
        setError(error);
        console.error('Error caught by useErrorHandler:', error);
    }, []);

    return { error, handleError, resetError };
}
