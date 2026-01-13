/**
 * Lazy-loaded Modal wrapper for code splitting
 */

import { lazy, Suspense } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Spinner } from '@heroui/react';

// Lazy load the ModelParamsModal content
const ModelParamsContent = lazy(() =>
    import('./workflow/modals/model-params-modal').then(mod => ({
        default: mod.ModelParamsModal
    }))
);

// Loading fallback for modal
function ModalLoadingFallback() {
    return (
        <div className="flex items-center justify-center p-8">
            <Spinner size="lg" />
        </div>
    );
}

// Re-export with lazy loading wrapper
export function LazyModelParamsModal(props: any) {
    return (
        <Suspense fallback={<ModalLoadingFallback />}>
            <ModelParamsContent {...props} />
        </Suspense>
    );
}
