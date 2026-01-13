"""
Document Extractor 节点执行器

从文档中提取文本内容。支持多种文档格式。

Author: chunlin
"""

from typing import Dict, Any, AsyncGenerator
import os
from core.variable_resolver import resolve_variables


async def execute_document_extractor_node(
    node_id: str,
    node_data: Dict[str, Any],
    state: Dict[str, Any],
    edges: list
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    执行 Document Extractor 节点：从文档提取文本。
    
    节点配置格式:
    {
        "variable": "{{start.file}}",  # 文件变量
    }
    
    支持的格式:
    - .txt, .md: 纯文本
    - .pdf: PDF 文档 (需要 pypdf)
    - .docx: Word 文档 (需要 python-docx)
    - .html: HTML 页面
    """
    variable = node_data.get("variable", "")
    
    # 解析文件路径/内容
    file_input = resolve_variables(variable, state)
    
    if not file_input:
        # 尝试从输入获取文件
        file_input = state.get("inputs", {}).get("file", "")
    
    extracted_text = ""
    
    if isinstance(file_input, dict):
        # 文件对象格式 {"path": "...", "content": "...", "type": "..."}
        if "content" in file_input:
            extracted_text = file_input["content"]
        elif "path" in file_input:
            extracted_text = await _extract_from_path(file_input["path"])
    elif isinstance(file_input, str):
        if os.path.exists(file_input):
            # 文件路径
            extracted_text = await _extract_from_path(file_input)
        else:
            # 直接是文本内容
            extracted_text = file_input
    
    yield {
        "type": "extracting",
        "node_id": node_id
    }
    
    output = {
        "text": extracted_text,
        "length": len(extracted_text)
    }
    
    state["outputs"][node_id] = output
    
    yield {
        "type": "extracted",
        "node_id": node_id,
        "text_length": len(extracted_text)
    }
    
    yield {
        "type": "result",
        "outputs": {node_id: output}
    }


async def _extract_from_path(file_path: str) -> str:
    """从文件路径提取文本"""
    ext = os.path.splitext(file_path)[1].lower()
    
    try:
        if ext in (".txt", ".md", ".csv"):
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        
        elif ext == ".pdf":
            try:
                from pypdf import PdfReader
                reader = PdfReader(file_path)
                text = ""
                for page in reader.pages:
                    text += page.extract_text() + "\n"
                return text.strip()
            except ImportError:
                return f"[PDF 提取需要安装 pypdf: pip install pypdf]"
        
        elif ext == ".docx":
            try:
                from docx import Document
                doc = Document(file_path)
                text = "\n".join([para.text for para in doc.paragraphs])
                return text
            except ImportError:
                return f"[DOCX 提取需要安装 python-docx: pip install python-docx]"
        
        elif ext in (".html", ".htm"):
            try:
                from bs4 import BeautifulSoup
                with open(file_path, "r", encoding="utf-8") as f:
                    soup = BeautifulSoup(f.read(), "html.parser")
                    return soup.get_text(separator="\n", strip=True)
            except ImportError:
                with open(file_path, "r", encoding="utf-8") as f:
                    return f.read()
        
        else:
            # 尝试作为文本读取
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
    
    except Exception as e:
        return f"[文件提取失败: {str(e)}]"
