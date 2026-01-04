"use client";

import SideBar from "./side-bar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
            <SideBar />
            <main className="flex-1 flex flex-col overflow-hidden relative">
                {children}
            </main>
        </div>
    );
}
