"""
Tortoise ORM 配置

用于 aerich 迁移工具。
"""

from configs import get_settings

settings = get_settings()

# Tortoise ORM 配置（用于 aerich）
TORTOISE_ORM = {
    "connections": {
        "default": settings.db_url
    },
    "apps": {
        "models": {
            "models": [
                "database.models.agent",
                "database.models.app",
                "database.models.workflow",
                "database.models.chat",
                "database.models.knowledge",
                "aerich.models",
            ],
            "default_connection": "default",
        },
    },
}
