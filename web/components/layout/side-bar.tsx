"use client";

import { Button, Tooltip } from "@heroui/react";
import {
  LayoutGrid,
  Library,
  MessageSquare,
  Compass,
  Settings,
  ShieldCheck,
  Zap
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const navItems = [
  { icon: Compass, label: "探索", href: "/explore" },
  { icon: LayoutGrid, label: "应用", href: "/apps" },
  { icon: Library, label: "知识库", href: "/knowledge" },
  { icon: Zap, label: "工具", href: "/tools" },
];

export default function SideBar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-[72px] flex-col items-center border-r border-divider bg-content1 py-4">
      <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
        <ShieldCheck size={24} />
      </div>

      <div className="flex flex-1 flex-col gap-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Tooltip key={item.href} content={item.label} placement="right">
              <Button
                as={Link}
                href={item.href}
                isIconOnly
                variant={isActive ? "flat" : "light"}
                color={isActive ? "primary" : "default"}
                className={clsx(
                  "h-12 w-12 rounded-xl transition-all",
                  !isActive && "text-foreground-500 hover:text-foreground"
                )}
              >
                <item.icon size={22} />
              </Button>
            </Tooltip>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col gap-4">
        <Tooltip content="设置" placement="right">
          <Button
            isIconOnly
            variant="light"
            className="h-12 w-12 rounded-xl text-foreground-500 hover:text-foreground"
          >
            <Settings size={22} />
          </Button>
        </Tooltip>
        
        <div className="h-10 w-10 overflow-hidden rounded-full bg-gradient-to-tr from-primary to-secondary p-[2px]">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-content1 text-xs font-bold">
            USER
          </div>
        </div>
      </div>
    </div>
  );
}
