"use client";

import { Card, CardBody, Chip } from "@heroui/react";
import { LayoutGrid, MessageSquare, Terminal, ChevronRight } from "lucide-react";
import Link from "next/link";

import type { AppItem } from "@/lib/types";

export default function AppCard({ app }: { app: AppItem }) {
  const Icon = app.mode === "workflow" ? LayoutGrid : app.mode === "agent" ? Terminal : MessageSquare;
  const color = app.mode === "workflow" ? "primary" : app.mode === "agent" ? "secondary" : "warning";

  return (
    <Link href={`/apps/${app.id}/orchestrate`} className="group">
      <Card className="hover:border-primary/50 transition-colors shadow-sm border border-divider">
        <CardBody className="p-5 flex flex-row items-center gap-4">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center bg-${color}/10 text-${color}`}>
            <Icon size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold truncate">{app.name}</span>
              <Chip size="sm" variant="flat" color={color as any} className="h-5 text-[10px] uppercase font-bold">
                {app.mode}
              </Chip>
            </div>
            <div className="text-xs text-foreground-500 mt-1 line-clamp-1">
              描述定义在这里，目前暂无...
            </div>
          </div>
          <ChevronRight size={18} className="text-foreground-300 group-hover:text-primary transition-colors" />
        </CardBody>
      </Card>
    </Link>
  );
}

