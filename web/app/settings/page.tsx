"use client";

import { Card, CardBody, Tab, Tabs } from "@heroui/react";
import { Key } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Settings, Users, Server } from "lucide-react";

import ModelProviderSettings from "./_components/model-providers";
import UserSettings from "./_components/user-settings";

export default function SettingsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const currentTab = searchParams.get("tab") || "models";

    const handleTabChange = (key: Key) => {
        router.push(`${pathname}?tab=${key}`);
    };

    return (
        <div className="flex h-full flex-col gap-6 p-6 w-full">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Settings className="w-6 h-6" />
                    系统设置
                </h1>
                <p className="text-default-500">管理 LLM 模型连接、用户权限及系统参数。</p>
            </div>

            <Card className="flex-1">
                <CardBody className="p-0 overflow-hidden">
                    <div className="flex h-full">
                        {/* 左侧垂直 Tabs */}
                        <div className="w-64 border-r border-default-200 bg-default-50 p-4">
                            <Tabs
                                aria-label="Settings"
                                selectedKey={currentTab}
                                onSelectionChange={handleTabChange}
                                isVertical
                                color="primary"
                                variant="light"
                                classNames={{
                                    tabList: "gap-2 w-full",
                                    cursor: "bg-default-200",
                                    tab: "justify-start h-10 px-3",
                                    tabContent: "group-data-[selected=true]:text-primary"
                                }}
                            >
                                <Tab
                                    key="models"
                                    title={
                                        <div className="flex items-center gap-2">
                                            <Server size={18} />
                                            <span>模型提供商</span>
                                        </div>
                                    }
                                />
                                <Tab
                                    key="users"
                                    title={
                                        <div className="flex items-center gap-2">
                                            <Users size={18} />
                                            <span>用户管理</span>
                                        </div>
                                    }
                                />
                            </Tabs>
                        </div>

                        {/* 右侧内容区域 */}
                        <div className="flex-1 p-6 overflow-y-auto">
                            {currentTab === "models" && <ModelProviderSettings />}
                            {currentTab === "users" && <UserSettings />}
                        </div>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}
