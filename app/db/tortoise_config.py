"""
Tortoise ORM 配置

用于 aerich 迁移工具。

Author: chunlin
"""

from app.core.config import load_settings

settings = load_settings()

# Tortoise ORM 配置（用于 aerich）
TORTOISE_ORM = {
    "connections": {
        "default": settings.db_url
    },
    "apps": {
        "models": {
            "models": ["app.db.models", "aerich.models"],
            "default_connection": "default",
        },
    },
}
