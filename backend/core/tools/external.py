"""
外部工具集成模块

集成第三方工具，包括 DuckDuckGo 搜索、Wikipedia、Python REPL、文件管理等。

Author: chunlin
"""

import os
import tempfile

from langchain_community.tools import DuckDuckGoSearchRun, WikipediaQueryRun
from langchain_community.utilities import WikipediaAPIWrapper
from langchain_community.agent_toolkits import FileManagementToolkit
from langchain_experimental.utilities import PythonREPL
from langchain_core.tools import Tool


# Search tools
ddg_search = DuckDuckGoSearchRun()
wikipedia = WikipediaQueryRun(api_wrapper=WikipediaAPIWrapper(lang="zh"))

# Python REPL tool
python_repl = PythonREPL()
python_tool = Tool(
    name="python_repl",
    description="一个 Python 交互式外壳。使用它来执行 Python 命令。输入应该是一个有效的 Python 命令。如果你想查看一个值的输出，你应该用 `print(...)` 打印出来。",
    func=python_repl.run,
)

# File management tools
WORKING_DIR = os.path.join(tempfile.gettempdir(), "llmops_sandbox")
if not os.path.exists(WORKING_DIR):
    os.makedirs(WORKING_DIR)

file_toolkit = FileManagementToolkit(
    root_dir=str(WORKING_DIR),
    selected_tools=["read_file", "write_file", "list_directory", "file_delete"]
)
file_tools = file_toolkit.get_tools()
