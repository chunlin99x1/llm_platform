"""
变量引用解析器

处理节点配置中的变量引用，支持多种引用格式：
- {{node_id.output_key}} - 引用节点输出
- {{sys.user_id}} - 引用系统变量
- {{#input_var#}} - 引用输入变量
- {{conversation.variable_name}} - 引用会话变量 (Chatflow)

Author: chunlin
"""

import re
from typing import Any, Dict, List, Optional, Tuple, Union


# 变量引用模式
VARIABLE_PATTERN = re.compile(r'\{\{([^}]+)\}\}')
# 系统变量前缀
SYS_PREFIX = "sys."
# 会话变量前缀
CONVERSATION_PREFIX = "conversation."


class VariableResolver:
    """变量解析器"""
    
    def __init__(
        self,
        inputs: Dict[str, Any] = None,
        outputs: Dict[str, Any] = None,
        variables: Dict[str, Any] = None,
        system_variables: Dict[str, Any] = None,
        conversation_variables: Dict[str, Any] = None,
    ):
        """
        初始化变量解析器
        
        Args:
            inputs: 用户输入变量 (Start 节点定义)
            outputs: 节点输出缓存 {node_id: {key: value}}
            variables: 临时变量
            system_variables: 系统变量 (user_id, conversation_id 等)
            conversation_variables: 会话变量 (Chatflow 专用)
        """
        self.inputs = inputs or {}
        self.outputs = outputs or {}
        self.variables = variables or {}
        self.system_variables = system_variables or {}
        self.conversation_variables = conversation_variables or {}
    
    def resolve(self, text: str) -> str:
        """
        解析文本中的变量引用
        
        Args:
            text: 包含变量引用的文本
            
        Returns:
            替换后的文本
        """
        if not text or not isinstance(text, str):
            return text
        
        def replace_match(match):
            var_path = match.group(1).strip()
            value = self._get_variable_value(var_path)
            return str(value) if value is not None else match.group(0)
        
        return VARIABLE_PATTERN.sub(replace_match, text)
    
    def resolve_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        递归解析字典中的变量引用
        
        Args:
            data: 包含变量引用的字典
            
        Returns:
            替换后的字典
        """
        result = {}
        for key, value in data.items():
            if isinstance(value, str):
                result[key] = self.resolve(value)
            elif isinstance(value, dict):
                result[key] = self.resolve_dict(value)
            elif isinstance(value, list):
                result[key] = self.resolve_list(value)
            else:
                result[key] = value
        return result
    
    def resolve_list(self, data: List[Any]) -> List[Any]:
        """递归解析列表中的变量引用"""
        result = []
        for item in data:
            if isinstance(item, str):
                result.append(self.resolve(item))
            elif isinstance(item, dict):
                result.append(self.resolve_dict(item))
            elif isinstance(item, list):
                result.append(self.resolve_list(item))
            else:
                result.append(item)
        return result
    
    def _get_variable_value(self, var_path: str) -> Optional[Any]:
        """
        获取变量值
        
        支持的格式：
        - sys.user_id -> 系统变量
        - conversation.var_name -> 会话变量
        - node_id.output_key -> 节点输出
        - input_key -> 输入变量
        """
        # 1. 系统变量
        if var_path.startswith(SYS_PREFIX):
            key = var_path[len(SYS_PREFIX):]
            return self.system_variables.get(key)
        
        # 2. 会话变量
        if var_path.startswith(CONVERSATION_PREFIX):
            key = var_path[len(CONVERSATION_PREFIX):]
            return self.conversation_variables.get(key)
        
        # 3. 节点输出引用 (node_id.output_key)
        if "." in var_path:
            parts = var_path.split(".", 1)
            node_id, output_key = parts[0], parts[1]
            
            node_output = self.outputs.get(node_id)
            if isinstance(node_output, dict):
                return node_output.get(output_key)
            return node_output
        
        # 4. 输入变量
        if var_path in self.inputs:
            return self.inputs[var_path]
        
        # 5. 临时变量
        if var_path in self.variables:
            return self.variables[var_path]
        
        return None
    
    def extract_variable_references(self, text: str) -> List[str]:
        """
        提取文本中的变量引用路径
        
        Args:
            text: 包含变量引用的文本
            
        Returns:
            变量引用路径列表
        """
        if not text or not isinstance(text, str):
            return []
        
        matches = VARIABLE_PATTERN.findall(text)
        return [m.strip() for m in matches]


def create_resolver_from_state(state: Dict[str, Any]) -> VariableResolver:
    """
    从执行状态创建变量解析器
    
    Args:
        state: 执行状态字典 {inputs, outputs, variables, ...}
        
    Returns:
        VariableResolver 实例
    """
    return VariableResolver(
        inputs=state.get("inputs", {}),
        outputs=state.get("outputs", {}),
        variables=state.get("variables", {}),
        system_variables=state.get("system_variables", {}),
        conversation_variables=state.get("conversation_variables", {}),
    )


def resolve_variables(text: str, state: Dict[str, Any]) -> str:
    """
    便捷函数：解析文本中的变量引用
    
    Args:
        text: 包含变量引用的文本
        state: 执行状态字典
        
    Returns:
        替换后的文本
    """
    resolver = create_resolver_from_state(state)
    return resolver.resolve(text)
