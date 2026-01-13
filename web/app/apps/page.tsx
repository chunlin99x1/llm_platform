"use client";

import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/skeleton";

const AppsPage = dynamic(() => import("@/components/apps/apps-page"), {
  loading: () => <PageSkeleton />,
  ssr: false
});

export default function Page() {
  return <AppsPage />;
}

