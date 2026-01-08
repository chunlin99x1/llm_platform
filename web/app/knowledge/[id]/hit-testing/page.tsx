"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
    Card,
    CardBody,
    Button,
    Textarea,
    Chip,
    Spinner,
    Slider,
    Switch,
    ScrollShadow,
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
} from "@heroui/react";
import { Search, FileText, ChevronDown, Settings2 } from "lucide-react";

interface HitTestingResult {
    content: string;
    score: number;
    document_id: number;
    document_name: string;
    segment_id: number;
    position: number;
    word_count: number;
}

interface HitTestingResponse {
    query: string;
    results: HitTestingResult[];
    total: number;
}

const retrievalModes = [
    { key: "hybrid", label: "混合检索" },
    { key: "semantic", label: "语义检索" },
    { key: "keyword", label: "关键词检索" },
];

export default function HitTestingPage() {
    const params = useParams();
    const kbId = params.id as string;

    const [query, setQuery] = useState("");
    const [retrievalMode, setRetrievalMode] = useState("hybrid");
    const [topK, setTopK] = useState(10);
    const [scoreThreshold, setScoreThreshold] = useState(0);
    const [rerank, setRerank] = useState(true);
    const [rerankTopK, setRerankTopK] = useState(5);

    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState<HitTestingResult[]>([]);

    async function handleSearch() {
        if (!query.trim()) return;

        setSearching(true);
        setResults([]);

        try {
            const resp = await fetch(`/api/knowledge/datasets/${kbId}/hit-testing`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query,
                    retrieval_mode: retrievalMode,
                    top_k: topK,
                    score_threshold: scoreThreshold,
                    rerank,
                    rerank_top_k: rerankTopK,
                }),
            });

            if (resp.ok) {
                const data: HitTestingResponse = await resp.json();
                setResults(data.results);
            }
        } catch (e) {
            console.error("Search failed:", e);
        } finally {
            setSearching(false);
        }
    }

    const selectedMode = retrievalModes.find(m => m.key === retrievalMode);

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 p-6 overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">召回测试</h2>
                <p className="text-xs text-gray-500 mt-1">输入查询文本，测试知识库的文档检索效果。</p>
            </div>

            <div className="flex-1 flex gap-6 min-h-0">
                {/* Left Panel: Configuration & Query */}
                <div className="w-[400px] flex flex-col gap-4 flex-shrink-0 flex-1 overflow-y-auto pr-2">
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 text-gray-900 font-medium">
                            <Settings2 size={16} />
                            <span>检索配置</span>
                        </div>

                        <div className="space-y-5">
                            {/* 检索模式 */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-500">检索模式</label>
                                <Dropdown>
                                    <DropdownTrigger>
                                        <Button
                                            variant="bordered"
                                            className="w-full justify-between bg-gray-50 border-gray-200"
                                            endContent={<ChevronDown size={14} className="text-gray-400" />}
                                        >
                                            {selectedMode?.label}
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownMenu onAction={(key) => setRetrievalMode(key as string)}>
                                        {retrievalModes.map(mode => (
                                            <DropdownItem key={mode.key}>{mode.label}</DropdownItem>
                                        ))}
                                    </DropdownMenu>
                                </Dropdown>
                            </div>

                            {/* Top K */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-500">Top K</span>
                                    <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{topK}</span>
                                </div>
                                <Slider
                                    aria-label="Top K"
                                    size="sm"
                                    step={1}
                                    minValue={1}
                                    maxValue={50}
                                    value={topK}
                                    onChange={(v) => setTopK(v as number)}
                                    className="max-w-full"
                                />
                            </div>

                            {/* Score Threshold */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-500">分数阈值</span>
                                    <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{scoreThreshold.toFixed(2)}</span>
                                </div>
                                <Slider
                                    aria-label="Score Threshold"
                                    size="sm"
                                    step={0.01}
                                    minValue={0}
                                    maxValue={1}
                                    value={scoreThreshold}
                                    onChange={(v) => setScoreThreshold(v as number)}
                                    className="max-w-full"
                                />
                            </div>

                            {/* Rerank */}
                            <div className="pt-2 border-t border-gray-100">
                                <div className="flex items-center justify-between mt-3 mb-2">
                                    <span className="text-xs font-medium text-gray-900">重排序 (Rerank)</span>
                                    <Switch isSelected={rerank} onValueChange={setRerank} size="sm" />
                                </div>

                                {rerank && (
                                    <div className="space-y-2 mt-3 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-500">最大数量</span>
                                            <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{rerankTopK}</span>
                                        </div>
                                        <Slider
                                            aria-label="Rerank Top K"
                                            size="sm"
                                            step={1}
                                            minValue={1}
                                            maxValue={20}
                                            value={rerankTopK}
                                            onChange={(v) => setRerankTopK(v as number)}
                                            className="max-w-full"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Query Area */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-gray-900 font-medium">
                            <Search size={16} />
                            <span>查询</span>
                        </div>
                        <Textarea
                            placeholder="在此输入您的查询文本..."
                            value={query}
                            onValueChange={setQuery}
                            minRows={4}
                            variant="bordered"
                            classNames={{
                                input: "text-sm",
                                inputWrapper: "bg-gray-50 hover:bg-white border-gray-200"
                            }}
                        />
                        <Button
                            className="w-full bg-[#155EEF] text-white font-medium"
                            onPress={handleSearch}
                            isLoading={searching}
                        >
                            开始测试
                        </Button>
                    </div>
                </div>

                {/* Right Panel: Results */}
                <div className="flex-[2] bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">检索结果</h3>
                            {results.length > 0 && <span className="bg-[#155EEF]/10 text-[#155EEF] text-xs px-2 py-0.5 rounded-full font-medium">{results.length}</span>}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                        {searching ? (
                            <div className="h-full flex items-center justify-center">
                                <Spinner size="lg" color="primary" />
                            </div>
                        ) : results.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                                    <Search size={32} className="opacity-40" />
                                </div>
                                <p className="text-sm font-medium text-gray-500">暂无测试结果</p>
                                <p className="text-xs mt-1">请在左侧输入查询文本并点击"开始测试"</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {results.map((result, i) => (
                                    <div
                                        key={i}
                                        className="relative group bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-blue-200 transition-all duration-200"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center justify-center w-6 h-6 rounded bg-green-50 text-green-600 text-xs font-bold border border-green-100">
                                                    {(result.score * 100).toFixed(0)}
                                                </div>
                                                <div className="h-4 w-[1px] bg-gray-200"></div>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                    <FileText size={12} className="text-gray-400" />
                                                    <span className="font-medium text-gray-700">{result.document_name}</span>
                                                    <span className="text-gray-300">•</span>
                                                    <span>段落 {result.position + 1}</span>
                                                </div>
                                            </div>
                                            <div className="px-2 py-0.5 rounded bg-gray-100 text-[10px] text-gray-500 font-mono">
                                                RANK #{i + 1}
                                            </div>
                                        </div>

                                        <div className="relative pl-3 border-l-2 border-blue-500/30 text-sm text-gray-700 leading-7 bg-gray-50/50 p-3 rounded-r-lg">
                                            {result.content}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
