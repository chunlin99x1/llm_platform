"""
文档分块器

支持多种分块策略：固定大小、递归字符、语义分块。

Author: chunlin
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from langchain_text_splitters import RecursiveCharacterTextSplitter
import hashlib
import uuid


@dataclass
class DocumentSegment:
    """文档片段"""
    id: str
    content: str
    metadata: Dict[str, Any]
    position: int
    tokens: int


class DocumentChunker:
    """
    文档分块器
    
    支持：
    - 固定大小分块
    - 递归字符分块（推荐）
    - 自定义分隔符
    """
    
    def __init__(
        self,
        chunk_size: int = 500,
        chunk_overlap: int = 50,
        separators: Optional[List[str]] = None
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or ["\n\n", "\n", "。", ".", " ", ""]
        
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=self.separators,
            length_function=len,
        )
    
    def chunk_document(
        self,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[DocumentSegment]:
        """
        将文档分块。
        
        Args:
            content: 文档内容
            metadata: 文档元数据（如文件名、来源等）
            
        Returns:
            文档片段列表
        """
        metadata = metadata or {}
        
        # 分块
        chunks = self.splitter.split_text(content)
        
        # 生成文档 ID（基于内容哈希）
        doc_hash = hashlib.md5(content.encode()).hexdigest()[:8]
        
        segments = []
        for i, chunk in enumerate(chunks):
            segment = DocumentSegment(
                id=f"{doc_hash}_{i}",
                content=chunk,
                metadata={
                    **metadata,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                    "doc_hash": doc_hash,
                },
                position=i,
                tokens=self._estimate_tokens(chunk)
            )
            segments.append(segment)
        
        return segments
    
    def chunk_documents(
        self,
        documents: List[Dict[str, Any]]
    ) -> List[DocumentSegment]:
        """
        批量分块多个文档。
        
        Args:
            documents: 文档列表，每个文档包含 content 和可选的 metadata
            
        Returns:
            所有文档的片段列表
        """
        all_segments = []
        
        for doc in documents:
            content = doc.get("content", "")
            metadata = doc.get("metadata", {})
            
            segments = self.chunk_document(content, metadata)
            all_segments.extend(segments)
        
        return all_segments
    
    def _estimate_tokens(self, text: str) -> int:
        """估算 token 数量（粗略：中文按字符，英文按词）"""
        # 简单估算：平均每 4 个字符约 1 个 token
        return len(text) // 4


class FixedSizeChunker(DocumentChunker):
    """固定大小分块器"""
    
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 0):
        super().__init__(chunk_size=chunk_size, chunk_overlap=chunk_overlap)


class SemanticChunker:
    """
    语义分块器（基于段落和标题）
    
    适用于结构化文档（Markdown、HTML 等）。
    """
    
    def __init__(self, max_chunk_size: int = 1000):
        self.max_chunk_size = max_chunk_size
    
    def chunk_markdown(self, content: str, metadata: Optional[Dict[str, Any]] = None) -> List[DocumentSegment]:
        """按 Markdown 标题分块"""
        import re
        
        metadata = metadata or {}
        doc_hash = hashlib.md5(content.encode()).hexdigest()[:8]
        
        # 按标题分割
        pattern = r'^(#{1,6})\s+(.+)$'
        sections = re.split(pattern, content, flags=re.MULTILINE)
        
        segments = []
        current_content = ""
        current_heading = ""
        position = 0
        
        i = 0
        while i < len(sections):
            section = sections[i].strip()
            
            if re.match(r'^#{1,6}$', section):
                # 保存前一个块
                if current_content:
                    segments.append(DocumentSegment(
                        id=f"{doc_hash}_{position}",
                        content=current_content.strip(),
                        metadata={**metadata, "heading": current_heading, "chunk_index": position},
                        position=position,
                        tokens=len(current_content) // 4
                    ))
                    position += 1
                
                # 新标题
                level = len(section)
                heading = sections[i + 1] if i + 1 < len(sections) else ""
                current_heading = heading
                current_content = f"{'#' * level} {heading}\n"
                i += 2
            else:
                current_content += section + "\n"
                i += 1
        
        # 保存最后一个块
        if current_content:
            segments.append(DocumentSegment(
                id=f"{doc_hash}_{position}",
                content=current_content.strip(),
                metadata={**metadata, "heading": current_heading, "chunk_index": position},
                position=position,
                tokens=len(current_content) // 4
            ))
        
        return segments
