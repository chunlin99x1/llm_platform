/**
 * Toast 通知组件
 * 统一的错误和成功提示 UI
 */

import { toast, Toaster } from 'sonner';

// 统一的 Toast 配置
export const toastConfig = {
    position: 'top-center' as const,
    duration: 3000,
    closeButton: true,
};

/**
 * 错误提示
 */
export function showError(message: string, description?: string) {
    toast.error(message, {
        description,
        duration: 5000,
    });
}

/**
 * 成功提示
 */
export function showSuccess(message: string, description?: string) {
    toast.success(message, {
        description,
    });
}

/**
 * 警告提示
 */
export function showWarning(message: string, description?: string) {
    toast.warning(message, {
        description,
    });
}

/**
 * 信息提示
 */
export function showInfo(message: string, description?: string) {
    toast.info(message, {
        description,
    });
}

/**
 * 加载提示
 */
export function showLoading(message: string = '处理中...') {
    return toast.loading(message);
}

/**
 * 关闭指定 Toast
 */
export function dismissToast(toastId: string | number) {
    toast.dismiss(toastId);
}

/**
 * API 错误处理
 */
export function handleApiError(error: unknown, fallbackMessage: string = '操作失败') {
    if (error instanceof Error) {
        showError(error.message);
    } else if (typeof error === 'string') {
        showError(error);
    } else {
        showError(fallbackMessage);
    }
    console.error(error);
}

/**
 * Promise Toast - 用于异步操作
 */
export function toastPromise<T>(
    promise: Promise<T>,
    messages: {
        loading: string;
        success: string;
        error: string;
    }
) {
    return toast.promise(promise, messages);
}

/**
 * Toaster 提供者组件
 * 在应用根组件中使用
 */
export function ToastProvider() {
    return (
        <Toaster
            position="top-center"
            toastOptions={{
                duration: 3000,
                classNames: {
                    toast: 'bg-background border-divider shadow-lg',
                    title: 'text-foreground text-sm font-medium',
                    description: 'text-foreground/60 text-xs',
                    error: 'border-danger/30 bg-danger/5',
                    success: 'border-success/30 bg-success/5',
                    warning: 'border-warning/30 bg-warning/5',
                    info: 'border-primary/30 bg-primary/5',
                },
            }}
            closeButton
        />
    );
}
