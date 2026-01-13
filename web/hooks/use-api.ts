/**
 * API 请求 Hooks - 统一的数据获取和缓存逻辑
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// 简单的内存缓存
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1分钟缓存

interface UseFetchOptions {
    cacheKey?: string;
    cacheTTL?: number;
    immediate?: boolean;
}

interface UseFetchResult<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    mutate: (data: T) => void;
}

/**
 * 通用数据获取 Hook
 */
export function useFetch<T>(
    url: string,
    options: UseFetchOptions = {}
): UseFetchResult<T> {
    const { cacheKey = url, cacheTTL = CACHE_TTL, immediate = true } = options;

    const [data, setData] = useState<T | null>(() => {
        // 初始化时检查缓存
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < cacheTTL) {
            return cached.data as T;
        }
        return null;
    });
    const [loading, setLoading] = useState(!data && immediate);
    const [error, setError] = useState<Error | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const fetchData = useCallback(async () => {
        // 取消之前的请求
        if (abortRef.current) {
            abortRef.current.abort();
        }
        abortRef.current = new AbortController();

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}${url}`, {
                signal: abortRef.current.signal,
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            setData(result);

            // 更新缓存
            cache.set(cacheKey, { data: result, timestamp: Date.now() });
        } catch (err) {
            if (err instanceof Error && err.name !== 'AbortError') {
                setError(err);
            }
        } finally {
            setLoading(false);
        }
    }, [url, cacheKey]);

    const mutate = useCallback((newData: T) => {
        setData(newData);
        cache.set(cacheKey, { data: newData, timestamp: Date.now() });
    }, [cacheKey]);

    useEffect(() => {
        if (immediate) {
            fetchData();
        }

        return () => {
            if (abortRef.current) {
                abortRef.current.abort();
            }
        };
    }, [fetchData, immediate]);

    return { data, loading, error, refetch: fetchData, mutate };
}

/**
 * 获取模型列表
 */
export function useModels() {
    return useFetch<any[]>('/settings/model-providers', {
        cacheKey: 'models',
        cacheTTL: 5 * 60 * 1000, // 5分钟缓存
    });
}

/**
 * 按类型获取模型列表
 * @param modelType - 模型类型：llm, embedding, rerank, tts
 */
export function useModelsByType(modelType?: string) {
    const url = modelType
        ? `/settings/model-providers?model_type=${modelType}`
        : '/settings/model-providers';

    return useFetch<any[]>(url, {
        cacheKey: `models-${modelType || 'all'}`,
        cacheTTL: 5 * 60 * 1000,
    });
}

/**
 * 获取知识库列表
 */
export function useKnowledgeBases() {
    return useFetch<any[]>('/knowledge/datasets', {
        cacheKey: 'knowledge-bases',
    });
}

/**
 * 获取工具列表
 */
export function useTools() {
    return useFetch<{ categories: any[] }>('/workflow/tools', {
        cacheKey: 'tools',
        cacheTTL: 5 * 60 * 1000,
    });
}

/**
 * 获取节点类型列表
 */
export function useNodeTypes() {
    return useFetch<{ nodes: any[] }>('/workflow/nodes/types', {
        cacheKey: 'node-types',
        cacheTTL: 10 * 60 * 1000,
    });
}

/**
 * 按应用模式获取可用节点类型
 * @param appMode - 应用模式：workflow, chatflow, agent
 */
export function useNodeTypesByMode(appMode?: string) {
    const { data, loading, error, refetch, mutate } = useNodeTypes();

    // 根据模式过滤节点
    const filteredNodes = data?.nodes?.filter((node: any) => {
        if (!appMode) return true;

        // Workflow 模式：排除 answer 节点
        if (appMode === 'workflow') {
            return node.type !== 'answer';
        }
        // Chatflow/Agent 模式：排除 end 节点
        if (appMode === 'chatflow' || appMode === 'agent') {
            return node.type !== 'end';
        }
        return true;
    }) || [];

    return {
        data: filteredNodes,
        loading,
        error,
        refetch,
        mutate: (nodes: any[]) => mutate({ nodes }),
    };
}

/**
 * 获取应用详情
 */
export function useApp(appId: number) {
    return useFetch<any>(`/apps/${appId}`, {
        cacheKey: `app-${appId}`,
    });
}

/**
 * 获取工作流配置
 */
export function useWorkflow(appId: number) {
    return useFetch<any>(`/apps/${appId}/workflow`, {
        cacheKey: `workflow-${appId}`,
    });
}

/**
 * 获取会话列表
 * @param appId - 应用 ID
 */
export function useConversations(appId: number) {
    return useFetch<{ conversations: any[]; total: number }>(`/conversations?app_id=${appId}`, {
        cacheKey: `conversations-${appId}`,
    });
}

/**
 * 清除所有缓存
 */
export function clearApiCache() {
    cache.clear();
}

/**
 * 清除特定缓存
 */
export function invalidateCache(key: string) {
    cache.delete(key);
}

