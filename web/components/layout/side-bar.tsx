"use client";

import { Button, Tooltip, Avatar } from "@heroui/react";
import {
  LayoutGrid,
  Library,
  MessageSquare,
  Compass,
  Settings,
  ShieldCheck,
  Zap,
  MoreVertical
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const navItems = [
  { icon: LayoutGrid, label: "应用", href: "/apps" },
  { icon: Library, label: "知识库", href: "/knowledge" },
  { icon: Zap, label: "工具", href: "/tools" },
];

export default function SideBar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-[56px] flex-col items-center border-r border-divider bg-white py-4 shadow-[1px_0_10px_rgba(0,0,0,0.02)] z-30">
      <div className="mb-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/30">
          <Zap size={18} fill="white" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Tooltip key={item.href} content={item.label} placement="right" delay={0} closeDelay={0}>
              <Link
                href={item.href}
                className={clsx(
                  "group relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-default-100 hover:text-foreground-600"
                )}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <div className="absolute -left-2 h-5 w-1 rounded-r-full bg-primary" />
                )}
              </Link>
            </Tooltip>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <Button
          as={Link}
          href="/settings"
          isIconOnly
          variant="light"
          className={clsx(
            "h-9 w-9 rounded-xl transition-all duration-300",
            pathname.startsWith("/settings")
              ? "bg-primary/10 text-primary"
              : "text-foreground hover:bg-default-100"
          )}
        >
          <Settings size={18} />
        </Button>
        <Avatar
          src="https://i.pravatar.cc/150?u=a042581f4e29026704d"
          className="h-8 w-8 cursor-pointer ring-2 ring-transparent hover:ring-primary/20 transition-all rounded-lg"
        />
      </div>
    </div>
  );
}
