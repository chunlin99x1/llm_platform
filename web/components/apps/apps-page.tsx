"use client";

import {
  Button,
  Card,
  CardBody,
  Input,
  Select,
  SelectItem,
  Tabs,
  Tab,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure
} from "@heroui/react";
import { LayoutGrid, MessageSquare, Terminal, Plus, Search, Filter } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { createApp, listApps } from "@/lib/api";
import type { AppItem } from "@/lib/types";

import AppCard from "./app-card";

export default function AppsPage() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Create App State
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [newName, setNewName] = useState("");
  const [newMode, setNewMode] = useState("workflow");
  const [creating, setCreating] = useState(false);

  // Debounced search logic
  useEffect(() => {
    const handler = setTimeout(() => {
      refresh(searchQuery, selectedCategory);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery, selectedCategory]);

  async function refresh(name?: string, mode?: string) {
    try {
      setLoading(true);
      const data = await listApps({ name, mode });
      setApps(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await createApp({ name: newName.trim(), mode: newMode });
      setApps([created, ...apps]);
      setNewName("");
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background text-xs">
      <header className="flex flex-col gap-4 px-6 py-4 bg-white border-b border-divider/60">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-lg font-black tracking-tight text-foreground-800">应用空间</h1>
            <p className="text-[11px] font-medium text-foreground">
              您可以从零开始创建一个应用，或者基于已有的模板快速起步。
            </p>
          </div>
          <Button
            color="primary"
            size="sm"
            startContent={<Plus size={14} />}
            onPress={onOpen}
            className="font-bold px-4 shadow-md shadow-primary/20 rounded-xl h-8 text-[11px]"
          >
            创建应用
          </Button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Tabs
            variant="underlined"
            aria-label="Categories"
            selectedKey={selectedCategory}
            onSelectionChange={(k) => setSelectedCategory(k as string)}
            classNames={{
              tabList: "gap-6 p-0 border-b-0",
              cursor: "w-full bg-primary h-[2px] rounded-t-full",
              tab: "max-w-fit px-0 h-8",
              tabContent: "group-data-[selected=true]:text-primary group-data-[selected=true]:font-bold text-[11px] text-foreground"
            }}
          >
            <Tab key="all" title="全部应用" />
            <Tab key="workflow" title="Workflow" />
            <Tab key="chatflow" title="Chatflow" />
            <Tab key="agent" title="Agent" />
          </Tabs>

          <div className="flex items-center gap-3 w-full md:w-[300px]">
            <Input
              placeholder="在您的应用库中搜索..."
              variant="bordered"
              radius="lg"
              size="sm"
              startContent={<Search size={14} className="text-foreground-300" />}
              value={searchQuery}
              onValueChange={setSearchQuery}
              classNames={{
                inputWrapper: "h-8 bg-content2/10 border-divider/80 hover:border-primary/40 transition-all font-medium",
                input: "text-[11px] placeholder:text-[10px]"
              }}
            />
            <Button isIconOnly variant="flat" radius="lg" size="sm" className="h-8 w-8 bg-content2/20 text-foreground-500">
              <Filter size={14} />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="max-w-[1600px] mx-auto">
          {apps.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {apps.map((a) => (
                <AppCard key={a.id} app={a} />
              ))}
            </div>
          ) : (
            <div className="flex h-[300px] flex-col items-center justify-center gap-4 text-foreground/30">
              <div className="relative">
                <LayoutGrid size={48} strokeWidth={1} />
                <Search size={20} className="absolute -right-1 -bottom-1 text-primary opacity-50" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="text-[11px] font-bold text-foreground-500">空空如也</div>
                <div className="text-[10px]">没有找到与您的检索条件相匹配的应用</div>
              </div>
              <Button variant="light" color="primary" size="sm" className="font-bold underline text-[11px]" onPress={() => { setSearchQuery(""); setSelectedCategory("all") }}>
                重置过滤条件
              </Button>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="2xl"
        backdrop="blur"
        classNames={{
          base: "bg-white rounded-[24px] p-1",
          header: "px-6 pt-6 pb-0",
          body: "px-6 py-6",
          footer: "px-6 pb-6 pt-0 border-0"
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-base font-black text-foreground-800">构建新应用</h2>
                <p className="text-[10px] font-medium text-foreground">选择一种模式来开始您的 AI 创作之旅。</p>
              </ModalHeader>
              <ModalBody className="gap-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 'workflow', label: 'Workflow', sub: '复杂自动化流程', icon: LayoutGrid, color: 'primary' },
                    { id: 'chatflow', label: 'Chatflow', sub: '对话式逻辑体验', icon: MessageSquare, color: 'warning' },
                    { id: 'agent', label: 'Agent', sub: '自主决策智能代理', icon: Terminal, color: 'secondary' },
                  ].map((item) => (
                    <Card
                      key={item.id}
                      isPressable
                      className={`border-1.5 transition-all duration-300 rounded-[16px] shadow-sm hover:shadow-md group ${newMode === item.id ? `border-${item.color} bg-${item.color}/5 ring-2 ring-${item.color}/10` : 'border-divider/50 bg-background hover:border-primary/30'}`}
                      onPress={() => setNewMode(item.id)}
                    >
                      <CardBody className="flex flex-col items-center gap-2.5 text-center p-4">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-transform duration-500 group-hover:scale-110 bg-${item.color}/10 text-${item.color}`}>
                          <item.icon size={18} />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <div className="font-black text-[11px]">{item.label}</div>
                          <div className="text-[9px] font-medium text-foreground leading-tight px-1">{item.sub}</div>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>

                <div className="flex flex-col gap-4 pt-2">
                  <Input
                    label="应用名称"
                    labelPlacement="outside"
                    placeholder="例如：论文阅读助手..."
                    variant="bordered"
                    radius="lg"
                    size="sm"
                    value={newName}
                    onValueChange={setNewName}
                    classNames={{
                      inputWrapper: "h-9 border-divider/80 focus-within:!border-primary/50 transition-all px-4",
                      label: "font-black text-foreground-600 mb-0.5 ml-1 text-[11px]",
                      input: "text-[11px]"
                    }}
                  />
                  <Input
                    label="应用描述 (可选)"
                    labelPlacement="outside"
                    placeholder="简要描述一下您的应用能做什么"
                    variant="bordered"
                    radius="lg"
                    size="sm"
                    classNames={{
                      inputWrapper: "h-9 border-divider/80 focus-within:!border-primary/50 transition-all px-4",
                      label: "font-black text-foreground-600 mb-0.5 ml-1 text-[11px]",
                      input: "text-[11px]"
                    }}
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" size="sm" className="font-bold text-foreground-500 px-5 h-8 text-[11px]" onPress={onClose}>
                  取消
                </Button>
                <Button
                  color="primary"
                  size="sm"
                  className="font-black px-6 shadow-md shadow-primary/20 rounded-xl h-8 text-[11px]"
                  isLoading={creating}
                  isDisabled={!newName.trim()}
                  onPress={handleCreate}
                >
                  立即开启
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
