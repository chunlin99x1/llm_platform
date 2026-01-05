"use client";

import { useCallback, useRef, useEffect } from "react";
import type { Node, Edge } from "reactflow";

interface HistoryState {
    nodes: Node[];
    edges: Edge[];
}

interface UseWorkflowHistoryOptions {
    maxHistorySize?: number;
}

interface UseWorkflowHistoryReturn {
    pushState: (state: HistoryState) => void;
    undo: () => HistoryState | null;
    redo: () => HistoryState | null;
    canUndo: boolean;
    canRedo: boolean;
}

export function useWorkflowHistory(
    options: UseWorkflowHistoryOptions = {}
): UseWorkflowHistoryReturn {
    const { maxHistorySize = 50 } = options;

    const historyRef = useRef<HistoryState[]>([]);
    const currentIndexRef = useRef(-1);
    const isInternalUpdateRef = useRef(false);

    const pushState = useCallback(
        (state: HistoryState) => {
            // 如果是内部更新（undo/redo触发的），不记录历史
            if (isInternalUpdateRef.current) {
                isInternalUpdateRef.current = false;
                return;
            }

            const history = historyRef.current;
            const currentIndex = currentIndexRef.current;

            // 如果不在历史末尾，删除当前位置之后的所有状态
            if (currentIndex < history.length - 1) {
                history.splice(currentIndex + 1);
            }

            // 深拷贝状态
            const stateCopy: HistoryState = {
                nodes: JSON.parse(JSON.stringify(state.nodes)),
                edges: JSON.parse(JSON.stringify(state.edges)),
            };

            history.push(stateCopy);

            // 限制历史大小
            if (history.length > maxHistorySize) {
                history.shift();
            } else {
                currentIndexRef.current++;
            }
        },
        [maxHistorySize]
    );

    const undo = useCallback((): HistoryState | null => {
        const history = historyRef.current;
        const currentIndex = currentIndexRef.current;

        if (currentIndex > 0) {
            currentIndexRef.current--;
            isInternalUpdateRef.current = true;
            return JSON.parse(JSON.stringify(history[currentIndexRef.current]));
        }
        return null;
    }, []);

    const redo = useCallback((): HistoryState | null => {
        const history = historyRef.current;
        const currentIndex = currentIndexRef.current;

        if (currentIndex < history.length - 1) {
            currentIndexRef.current++;
            isInternalUpdateRef.current = true;
            return JSON.parse(JSON.stringify(history[currentIndexRef.current]));
        }
        return null;
    }, []);

    const canUndo = currentIndexRef.current > 0;
    const canRedo = currentIndexRef.current < historyRef.current.length - 1;

    return {
        pushState,
        undo,
        redo,
        canUndo,
        canRedo,
    };
}

interface UseWorkflowShortcutsOptions {
    onUndo: () => void;
    onRedo: () => void;
    onCopy: () => void;
    onPaste: () => void;
    onDelete: () => void;
    onSelectAll: () => void;
    onSave: () => void;
    enabled?: boolean;
}

export function useWorkflowShortcuts(options: UseWorkflowShortcutsOptions) {
    const {
        onUndo,
        onRedo,
        onCopy,
        onPaste,
        onDelete,
        onSelectAll,
        onSave,
        enabled = true,
    } = options;

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // 检查是否在输入框内
            const target = e.target as HTMLElement;
            const isInputFocused =
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable;

            const isMod = e.metaKey || e.ctrlKey;

            // Ctrl/Cmd + Z = Undo
            if (isMod && e.key === "z" && !e.shiftKey) {
                e.preventDefault();
                onUndo();
                return;
            }

            // Ctrl/Cmd + Shift + Z 或 Ctrl/Cmd + Y = Redo
            if ((isMod && e.key === "z" && e.shiftKey) || (isMod && e.key === "y")) {
                e.preventDefault();
                onRedo();
                return;
            }

            // Ctrl/Cmd + S = Save
            if (isMod && e.key === "s") {
                e.preventDefault();
                onSave();
                return;
            }

            // 以下快捷键在输入框内不触发
            if (isInputFocused) return;

            // Ctrl/Cmd + C = Copy
            if (isMod && e.key === "c") {
                e.preventDefault();
                onCopy();
                return;
            }

            // Ctrl/Cmd + V = Paste
            if (isMod && e.key === "v") {
                e.preventDefault();
                onPaste();
                return;
            }

            // Ctrl/Cmd + A = Select All
            if (isMod && e.key === "a") {
                e.preventDefault();
                onSelectAll();
                return;
            }

            // Delete / Backspace = Delete
            if (e.key === "Delete" || e.key === "Backspace") {
                e.preventDefault();
                onDelete();
                return;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [enabled, onUndo, onRedo, onCopy, onPaste, onDelete, onSelectAll, onSave]);
}
