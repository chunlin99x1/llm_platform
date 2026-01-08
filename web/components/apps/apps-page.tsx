"use client";

import {
  Button,
  Input,
  Tabs,
  Tab,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Card,
  CardBody
} from "@heroui/react";
import { LayoutGrid, MessageSquare, Terminal, Plus, Search, Filter } from "lucide-react";
import { useEffect, useState } from "react";
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
    <div className="flex-1 flex flex-col min-h-0 bg-gray-50 dark:bg-gray-900">
      <header className="flex flex-col gap-4 px-12 py-6 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">应用空间</h1>
          <Button
            color="primary"
            className="px-4 font-medium rounded-lg text-sm bg-[#155EEF] hover:bg-[#155EEF]/90 text-white"
            startContent={<Plus size={16} />}
            onPress={onOpen}
          >
            创建应用
          </Button>
        </div>
        <div className="text-sm text-gray-500 max-w-4xl">
          Dify 能够根据不同的应用场景，构建不同类型的应用。
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
          <Tabs
            variant="underlined"
            aria-label="Categories"
            selectedKey={selectedCategory}
            onSelectionChange={(k) => setSelectedCategory(k as string)}
            classNames={{
              tabList: "gap-6 p-0 border-b-0",
              cursor: "w-full bg-[#155EEF] h-[2px]",
              tab: "max-w-fit px-0 h-9",
              tabContent: "group-data-[selected=true]:text-[#155EEF] group-data-[selected=true]:font-semibold text-sm text-gray-500"
            }}
          >
            <Tab key="all" title="全部应用" />
            <Tab key="workflow" title="Workflow" />
            <Tab key="chatflow" title="Chatflow" />
            <Tab key="agent" title="Agent" />
          </Tabs>

          <div className="flex items-center gap-3 w-full md:w-[240px]">
            <Input
              placeholder="搜索应用"
              variant="bordered"
              radius="lg"
              size="md" // Dify 的搜索框其实不小
              startContent={<Search size={16} className="text-gray-400" />}
              value={searchQuery}
              onValueChange={setSearchQuery}
              classNames={{
                inputWrapper: "h-9 bg-white border-gray-200 hover:border-gray-300 transition-all shadow-sm",
                input: "text-sm placeholder:text-gray-400"
              }}
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-12 pb-6">
        <div className="max-w-full">
          {apps.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {apps.map((a) => (
                <AppCard key={a.id} app={a} />
              ))}
            </div>
          ) : (
            <div className="flex h-[400px] flex-col items-center justify-center gap-4 text-gray-300">
              <div className="bg-gray-100 p-4 rounded-full">
                <LayoutGrid size={32} strokeWidth={1.5} className="text-gray-400" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="text-sm font-medium text-gray-600">这里什么都没有</div>
                <div className="text-xs text-gray-400">去创建一个新的应用吧</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="2xl"
        classNames={{
          base: "bg-white rounded-2xl",
          header: "px-8 pt-8 pb-4",
          body: "px-8 pb-8",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold text-gray-900">创建应用</h2>
                <p className="text-sm text-gray-500 font-normal">选择应用类型并开始构建</p>
              </ModalHeader>
              <ModalBody className="gap-6">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'workflow', label: '工作流', sub: '针对流程化任务', icon: LayoutGrid, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { id: 'chatflow', label: '聊天助手', sub: '基于 LLM 的对话', icon: MessageSquare, color: 'text-violet-600', bg: 'bg-violet-50' },
                    { id: 'agent', label: 'Agent', sub: '自主任务执行', icon: Terminal, color: 'text-amber-600', bg: 'bg-amber-50' },
                  ].map((item) => (
                    <div
                      key={item.id}
                      className={`cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md ${newMode === item.id ? 'border-blue-600 ring-1 ring-blue-600 bg-blue-50/30' : 'border-gray-200 hover:border-blue-200'}`}
                      onClick={() => setNewMode(item.id)}
                    >
                      <div className={`mb-3 h-8 w-8 rounded-lg flex items-center justify-center ${item.bg} ${item.color}`}>
                        <item.icon size={18} />
                      </div>
                      <div className="font-semibold text-sm text-gray-900">{item.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{item.sub}</div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-4">
                  <Input
                    label="应用名称"
                    labelPlacement="outside"
                    placeholder="给你的应用起个名字"
                    variant="bordered"
                    radius="md"
                    value={newName}
                    onValueChange={setNewName}
                    classNames={{
                      inputWrapper: "h-10 border-gray-300",
                      label: "text-sm font-medium text-gray-700 mb-1"
                    }}
                  />
                  <Input
                    label="描述"
                    labelPlacement="outside"
                    placeholder="描述应用的功能"
                    variant="bordered"
                    radius="md"
                    classNames={{
                      inputWrapper: "h-10 border-gray-300",
                      label: "text-sm font-medium text-gray-700 mb-1"
                    }}
                  />
                </div>
              </ModalBody>
              <ModalFooter className="px-8 pb-8 pt-0 border-0">
                <Button variant="light" onPress={onClose} className="font-medium text-gray-600">
                  取消
                </Button>
                <Button
                  color="primary"
                  className="bg-[#155EEF] font-medium"
                  onPress={handleCreate}
                  isLoading={creating}
                  isDisabled={!newName.trim()}
                >
                  创建
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
