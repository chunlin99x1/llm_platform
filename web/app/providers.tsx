"use client";

import { HeroUIProvider } from "@heroui/react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { ConfirmProvider } from "@/components/ui/confirm-provider";

export default function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  return (
    <HeroUIProvider navigate={router.push}>
      <Toaster position="top-right" richColors closeButton />
      <ConfirmProvider>
        {children}
      </ConfirmProvider>
    </HeroUIProvider>
  );
}

