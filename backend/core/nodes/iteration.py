"""迭代节点执行器

循环处理列表数据。
"""

from typing import Dict, Any, AsyncGenerator
import json


async def execute_iteration_node(
    node_id: str,
    node_data: Dict[str, Any],
    state: Dict[str, Any],
    edges: list
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    执行迭代节点：对列表数据进行循环处理。
    """
    input_var = node_data.get("input_variable", "")
    output_var = node_data.get("output_variable", "items")
    
    # 获取输入列表
    input_list = []
    
    # 从 inputs 获取
    if input_var in state["inputs"]:
        val = state["inputs"][input_var]
        if isinstance(val, list):
            input_list = val
        elif isinstance(val, str):
            try:
                input_list = json.loads(val)
            except:
                input_list = val.split("\n")
    
    # 从上游输出获取
    if not input_list:
        for out_data in state["outputs"].values():
            if isinstance(out_data, dict) and input_var in out_data:
                val = out_data[input_var]
                if isinstance(val, list):
                    input_list = val
                break
    
    # 迭代处理（简化版：直接返回列表）
    # 实际应该为每个元素执行子工作流
    results = []
    for i, item in enumerate(input_list):
        results.append({
            "index": i,
            "item": item,
            "processed": True
        })
        # 发送进度
        yield {
            "type": "output",
            "chunk": f"Processing item {i+1}/{len(input_list)}\n"
        }
    
    result = {
        output_var: results,
        "count": len(results),
        "success": True
    }
    
    state["outputs"][node_id] = result
    yield {
        "type": "result",
        "outputs": {node_id: result}
    }
