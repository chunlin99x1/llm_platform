"use client";

import { Card, CardBody, Tab, Tabs } from "@heroui/react";

import ChatPanel from "@/components/chat-panel";
import WorkflowPanel from "@/components/workflow-panel";

export default function AppShell() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <div className="text-2xl font-bold">LLMOps 原型</div>
        <div className="text-sm text-foreground-500">
          前端：Next.js + HeroUI；后端：FastAPI（/chat、/workflow/run）
        </div>
      </div>

      <Card>
        <CardBody>
          <Tabs aria-label="功能" color="primary" variant="underlined">
            <Tab key="chat" title="聊天">
              <div className="pt-4">
                <ChatPanel />
              </div>
            </Tab>
            <Tab key="workflow" title="工作流">
              <div className="pt-4">
                <WorkflowPanel />
              </div>
            </Tab>
          </Tabs>
        </CardBody>
      </Card>
    </main>
  );
}

