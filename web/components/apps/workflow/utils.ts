import {
    Play,
    MessageSquare,
    GitBranch,
    Code,
    Globe,
    Variable,
    Repeat,
    FileCode,
    Box,
    CheckCircle
} from "lucide-react";

export function getNodeMeta(type: string | undefined) {
    switch (type) {
        case 'start': return { icon: Play, color: 'bg-primary', label: '开始' };
        case 'end': return { icon: CheckCircle, color: 'bg-danger', label: '结束' };
        case 'answer': return { icon: MessageSquare, color: 'bg-orange-500', label: '直接回复' };
        case 'llm': return { icon: Box, color: 'bg-blue-500', label: 'LLM' };
        case 'condition': return { icon: GitBranch, color: 'bg-gray-500', label: '条件分支' };
        case 'code': return { icon: Code, color: 'bg-emerald-500', label: '代码执行' };
        case 'http': return { icon: Globe, color: 'bg-purple-500', label: 'HTTP 请求' };
        case 'variable': return { icon: Variable, color: 'bg-amber-500', label: '变量赋值' };
        case 'iteration': return { icon: Repeat, color: 'bg-cyan-500', label: '迭代' };
        case 'template': return { icon: Code, color: 'bg-indigo-500', label: '模板转换' };
        case 'knowledge': return { icon: Box, color: 'bg-pink-500', label: '知识检索' };
        case 'extractor': return { icon: FileCode, color: 'bg-yellow-500', label: '参数提取' };
        case 'classifier': return { icon: Box, color: 'bg-teal-500', label: '问题分类' };
        default: return { icon: Box, color: 'bg-gray-400', label: '未知节点' };
    }
}
