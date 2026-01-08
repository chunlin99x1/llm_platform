"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
    Card,
    CardBody,
    CardHeader,
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
import { Search, FileText, Target, ChevronDown } from "lucide-react";

interface HitTestingResult {
    content: string;
    score: float;
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
    const [searchQuery, setSearchQuery] = useState("");

    async function handleSearch() {
        if (!query.trim()) return;

        setSearching(true);
        setResults([]);
        setSearchQuery(query);

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 查询面板 */}
            <Card className="h-fit">
                <CardHeader className="flex items-center gap-2 pb-0">
                    <Target size={18} className="text-primary" />
                    <span className="font-bold">召回测试</span>
                </CardHeader>
                <CardBody className="space-y-4">
                    <Textarea
                        label="查询文本"
                        placeholder="输入查询内容..."
                        value={query}
                        onValueChange={setQuery}
                        variant="bordered"
                        minRows={4}
                    />

                    {/* 检索模式 */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">检索模式</span>
                        <Dropdown>
                            <DropdownTrigger>
                                <Button variant="bordered" size="sm" endContent={<ChevronDown size={14} />}>
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
                            <span className="text-sm font-medium">Top K</span>
                            <span className="text-sm text-foreground-500">{topK}</span>
                        </div>
                        <Slider
                            size="sm"
                            step={1}
                            minValue={1}
                            maxValue={50}
                            value={topK}
                            onChange={(v) => setTopK(v as number)}
                        />
                    </div>

                    {/* Score Threshold */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">分数阈值</span>
                            <span className="text-sm text-foreground-500">{scoreThreshold.toFixed(2)}</span>
                        </div>
                        <Slider
                            size="sm"
                            step={0.01}
                            minValue={0}
                            maxValue={1}
                            value={scoreThreshold}
                            onChange={(v) => setScoreThreshold(v as number)}
                        />
                    </div>

                    {/* Rerank */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">重排序 (Rerank)</span>
                        <Switch isSelected={rerank} onValueChange={setRerank} size="sm" />
                    </div>

                    {rerank && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Rerank Top K</span>
                                <span className="text-sm text-foreground-500">{rerankTopK}</span>
                            </div>
                            <Slider
                                size="sm"
                                step={1}
                                minValue={1}
                                maxValue={20}
                                value={rerankTopK}
                                onChange={(v) => setRerankTopK(v as number)}
                            />
                        </div>
                    )}

                    <Button
                        color="primary"
                        className="w-full"
                        onPress={handleSearch}
                        isLoading={searching}
                        startContent={!searching && <Search size={16} />}
                    >
                        执行检索
                    </Button>
                </CardBody>
            </Card>

            {/* 结果面板 */}
            <Card className="h-fit min-h-[400px]">
                <CardHeader className="flex items-center gap-2 pb-0">
                    <FileText size={18} className="text-success" />
                    <span className="font-bold">检索结果</span>
                    {results.length > 0 && (
                        <Chip size="sm" variant="flat">
                            {results.length} 条
                        </Chip>
                    )}
                </CardHeader>
                <CardBody>
                    {searching ? (
                        <div className="flex items-center justify-center py-20">
                            <Spinner />
                        </div>
                    ) : results.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-foreground-400">
                            <Search size={48} className="mb-4 opacity-30" />
                            <p className="text-sm">输入查询内容进行检索</p>
                        </div>
                    ) : (
                        <ScrollShadow className="max-h-[600px] space-y-3">
                            {results.map((result, i) => (
                                <div
                                    key={i}
                                    className="p-4 rounded-lg border border-divider bg-content1 hover:border-primary/30 transition-colors"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Chip size="sm" color="success" variant="flat">
                                                {(result.score * 100).toFixed(1)}%
                                            </Chip>
                                            <Chip size="sm" variant="flat">
                                                #{result.position + 1}
                                            </Chip>
                                        </div>
                                        <span className="text-xs text-foreground-500">
                                            {result.document_name}
                                        </span>
                                    </div>
                                    <p className="text-sm leading-relaxed">
                                        {result.content}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2 text-xs text-foreground-400">
                                        <span>{result.word_count} 字符</span>
                                    </div>
                                </div>
                            ))}
                        </ScrollShadow>
                    )}
                </CardBody>
            </Card>
        </div>
    );
}
