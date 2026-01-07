"""知识库检索节点执行器

从向量数据库检索相关文档（RAG）。
"""

from typing import Dict, Any, AsyncGenerator


async def execute_knowledge_node(
    node_id: str,
    node_data: Dict[str, Any],
    state: Dict[str, Any],
    edges: list
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    执行知识库检索节点：从向量库检索相关内容。
    """
    from langchain_openai import OpenAIEmbeddings
    from langchain_community.vectorstores import FAISS
    import os
    
    query = node_data.get("query", "")
    knowledge_id = node_data.get("knowledge_id", "")
    top_k = node_data.get("top_k", 3)
    
    # 变量替换
    for k, v in state["inputs"].items():
        query = query.replace(f"{{{{{k}}}}}", str(v))
    
    for out_node_id, out_data in state["outputs"].items():
        if isinstance(out_data, dict):
            for out_key, out_val in out_data.items():
                query = query.replace(f"{{{{{out_node_id}.{out_key}}}}}", str(out_val))
    
    if not query:
        query = state["inputs"].get("input", "")
    
    try:
        # 加载向量库（简化版，实际应从数据库加载）
        embeddings = OpenAIEmbeddings()
        
        # 尝试加载已保存的向量库
        vector_store_path = f"./data/knowledge/{knowledge_id}"
        
        if os.path.exists(vector_store_path):
            vectorstore = FAISS.load_local(
                vector_store_path, 
                embeddings,
                allow_dangerous_deserialization=True
            )
            
            # 检索
            docs = vectorstore.similarity_search(query, k=top_k)
            
            results = [
                {"content": doc.page_content, "metadata": doc.metadata}
                for doc in docs
            ]
            
            # 合并检索结果为上下文
            context = "\n\n".join([doc.page_content for doc in docs])
            
            result = {
                "context": context,
                "documents": results,
                "count": len(results)
            }
        else:
            result = {
                "context": "",
                "documents": [],
                "count": 0,
                "error": f"Knowledge base '{knowledge_id}' not found"
            }
    except Exception as e:
        result = {"error": str(e), "context": "", "documents": [], "count": 0}
    
    state["outputs"][node_id] = result
    yield {
        "type": "result",
        "outputs": {node_id: result}
    }
