"use client";

import React, { createContext, useContext, useState, useRef, ReactNode, useCallback } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    useDisclosure,
} from "@heroui/react";
import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: "info" | "warning" | "danger" | "success";
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error("useConfirm must be used within a ConfirmProvider");
    }
    return context;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
    const { isOpen, onOpen, onClose, onOpenChange } = useDisclosure();
    const [options, setOptions] = useState<ConfirmOptions>({ message: "" });
    const resolveRef = useRef<(value: boolean) => void>((_: boolean) => { });

    const confirm = useCallback((opts: ConfirmOptions | string) => {
        const options = typeof opts === "string" ? { message: opts } : opts;
        setOptions({
            title: "确认",
            confirmText: "确定",
            cancelText: "取消",
            type: "warning",
            ...options,
        });
        onOpen();
        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve;
        });
    }, [onOpen]);

    const handleConfirm = () => {
        resolveRef.current(true);
        onClose();
    };

    const handleCancel = () => {
        resolveRef.current(false);
        onClose();
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            resolveRef.current(false);
            onClose();
        } else {
            onOpen();
        }
    };

    // Color mapping
    const getColor = (type: string = "warning") => {
        switch (type) {
            case "danger": return "danger";
            case "success": return "success";
            case "info": return "primary";
            default: return "warning";
        }
    };

    const getIcon = (type: string = "warning") => {
        switch (type) {
            case "danger": return <AlertTriangle className="text-danger" size={24} />;
            case "success": return <CheckCircle2 className="text-success" size={24} />;
            case "info": return <Info className="text-primary" size={24} />;
            default: return <AlertTriangle className="text-warning" size={24} />;
        }
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            <Modal
                isOpen={isOpen}
                onOpenChange={handleOpenChange}
                backdrop="blur"
                classNames={{
                    base: "bg-white dark:bg-gray-800 border-none shadow-xl",
                    header: "border-b border-gray-100 dark:border-gray-700",
                    footer: "border-t border-gray-100 dark:border-gray-700",
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex gap-3 items-center text-gray-900 dark:text-white">
                                {getIcon(options.type)}
                                {options.title}
                            </ModalHeader>
                            <ModalBody className="py-6">
                                <p className="text-gray-600 dark:text-gray-300">
                                    {options.message}
                                </p>
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="light" onPress={handleCancel}>
                                    {options.cancelText}
                                </Button>
                                <Button
                                    color={getColor(options.type) as any}
                                    onPress={handleConfirm}
                                    className="font-medium"
                                >
                                    {options.confirmText}
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </ConfirmContext.Provider>
    );
}
