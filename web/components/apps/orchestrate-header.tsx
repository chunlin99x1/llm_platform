"use client";

import { memo } from "react";
import {
    Button,
    Divider,
    Tabs,
    Tab,
    Tooltip,
    Breadcrumbs,
    BreadcrumbItem,
} from "@heroui/react";
import {
    Play,
    Save,
    Settings,
    ChevronLeft,
} from "lucide-react";
import Link from "next/link";

import { type AppItem } from "@/lib/types";

interface OrchestrateHeaderProps {
    app: AppItem | null;
    appId: number;
    activeTab: string;
    setActiveTab: (key: string) => void;
    saving: boolean;
    onSave: () => void;
}

export const OrchestrateHeader = memo(function OrchestrateHeader({
    app,
    appId,
    activeTab,
    setActiveTab,
    saving,
    onSave
}: OrchestrateHeaderProps) {
    return (
        <header className="flex h-[48px] items-center justify-between border-b border-divider bg-background/80 backdrop-blur-md px-4 z-20">
            <div className="flex items-center gap-4">
                <Button as={Link} href="/apps" isIconOnly variant="light" size="sm" className="text-foreground h-8 w-8">
                    <ChevronLeft size={16} />
                </Button>

                {app && (
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${app.icon_background || "bg-primary/10"}`}>
                            <div className="text-xl">{app.icon || "🤖"}</div>
                        </div>
                        <div className="flex flex-col">
                            <div className="text-[10px] text-foreground-500 font-medium leading-none mb-0.5 uppercase tracking-wider">
                                {app.mode === "agent" ? "Agent" : (app.mode === "chatflow" ? "Chatflow" : "Workflow")}
                            </div>
                            <div className="text-[13px] font-bold text-foreground leading-none">
                                {app.name}
                            </div>
                        </div>
                    </div>
                )}


                <Divider orientation="vertical" className="h-4 mx-1" />

                <Tabs
                    variant="light"
                    aria-label="Nav"
                    selectedKey={activeTab}
                    onSelectionChange={(k) => setActiveTab(k as string)}
                    classNames={{
                        tabList: "gap-4 p-0",
                        cursor: "w-full bg-primary/10",
                        tab: "max-w-fit px-3 h-8 rounded-lg",
                        tabContent: "group-data-[selected=true]:text-primary group-data-[selected=true]:font-bold text-[11px]",
                    }}
                >
                    <Tab key="orchestrate" title="编排" />
                    <Tab key="preview" title="调试" />
                    <Tab key="logs" title="日志" />
                </Tabs>
            </div>

            <div className="flex items-center gap-2">
                <Tooltip content="设置">
                    <Button isIconOnly variant="light" size="sm" className="text-foreground-500 h-8 w-8">
                        <Settings size={14} />
                    </Button>
                </Tooltip>

                <div className="flex items-center gap-2 ml-2">
                    <Button
                        variant="flat"
                        size="sm"
                        startContent={<Play size={12} />}
                        onPress={() => setActiveTab("preview")}
                        className="font-bold bg-content2 hover:bg-content3 h-8 text-[11px]"
                    >
                        运行预览
                    </Button>
                    <Button
                        color="primary"
                        size="sm"
                        startContent={<Save size={12} />}
                        isLoading={saving}
                        onPress={onSave}
                        className="font-bold shadow-md shadow-primary/20 h-8 text-[11px]"
                    >
                        发布更新
                    </Button>
                </div>
            </div>
        </header>
    );
});
