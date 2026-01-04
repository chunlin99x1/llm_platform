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
      <Card className="hover:border-primary/50 transition-colors shadow-sm border border-divider rounded-xl">
        <CardBody className="p-3 flex flex-row items-center gap-3">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center bg-${color}/10 text-${color} shrink-0`}>
            <Icon size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold truncate text-[13px] text-foreground-800">{app.name}</span>
              <Chip size="sm" variant="flat" color={color as any} className="h-4 px-1 text-[9px] uppercase font-bold min-w-0">
                {app.mode}
              </Chip>
            </div>
            <div className="text-[11px] text-foreground mt-0.5 line-clamp-1">
              描述定义在这里，目前暂无...
            </div>
          </div>
          <ChevronRight size={14} className="text-foreground-300 group-hover:text-primary transition-colors shrink-0" />
        </CardBody>
      </Card>
    </Link>
  );
}

