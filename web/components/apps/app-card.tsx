"use client";

import { Card, CardBody, Chip } from "@heroui/react";
import { LayoutGrid, MessageSquare, Terminal, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import type { AppItem } from "@/lib/types";

export default function AppCard({ app }: { app: AppItem }) {
  // 定义颜色映射
  const config = {
    workflow: { icon: LayoutGrid, bg: "bg-blue-50", text: "text-blue-600", label: "Workflow" },
    agent: { icon: Terminal, bg: "bg-amber-50", text: "text-amber-600", label: "Agent" },
    chatflow: { icon: MessageSquare, bg: "bg-violet-50", text: "text-violet-600", label: "Chatflow" },
  }[app.mode] || { icon: LayoutGrid, bg: "bg-gray-50", text: "text-gray-600", label: "App" };

  const Icon = config.icon;

  return (
    <Link href={`/apps/${app.id}/orchestrate`} className="block group h-full">
      <div className="relative flex flex-col h-full bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all duration-200 cursor-pointer">

        {/* Header with Icon and Title */}
        <div className="flex items-start gap-4 mb-3">
          <div className={`shrink-0 w-10 h-10 rounded-lg ${config.bg} ${config.text} flex items-center justify-center`}>
            <Icon size={20} />
          </div>
          <div className="flex-1 min-w-0 py-0.5">
            <h3 className="text-sm font-semibold text-gray-900 truncate mb-1">
              {app.name}
            </h3>
            <div className="flex items-center">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 uppercase tracking-wider">
                {config.label}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="flex-1">
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
            {app.description || "这个应用没有描述。"}
          </p>
        </div>

        {/* Footer Actions (Hover only) */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>
    </Link>
  );
}
