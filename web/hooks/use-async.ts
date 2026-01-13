import { useCallback, useEffect, useState } from 'react';

type AsyncState<T> = {
    data: T | null;
    loading: boolean;
    error: Error | null;
};

type AsyncFunction<T> = () => Promise<T>;

/**
 * Hook for managing async operations with loading and error states
 * @param asyncFunction - The async function to execute
 * @param immediate - Whether to execute immediately on mount
 * @returns Object containing data, loading state, error, and execute function
 */
export function useAsync<T>(
    asyncFunction: AsyncFunction<T>,
    immediate: boolean = true
) {
    const [state, setState] = useState<AsyncState<T>>({
        data: null,
        loading: immediate,
        error: null,
    });

    const execute = useCallback(async () => {
        setState({ data: null, loading: true, error: null });
        try {
            const data = await asyncFunction();
            setState({ data, loading: false, error: null });
            return data;
        } catch (error) {
            setState({ data: null, loading: false, error: error as Error });
            throw error;
        }
    }, [asyncFunction]);

    useEffect(() => {
        if (immediate) {
            execute();
        }
    }, [execute, immediate]);

    return { ...state, execute };
}
