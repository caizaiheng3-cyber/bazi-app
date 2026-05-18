"""应用配置"""

import os
from pathlib import Path

# 项目根目录（八字项目的根目录）
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent

# Web 后端目录
BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent

# 数据库路径
DATABASE_URL = f"sqlite:///{BACKEND_ROOT / 'data' / 'app.db'}"

# 密码（明文，MVP阶段够用）
AUTH_PASSWORD = os.environ.get("AUTH_PASSWORD", "123456")

# Token 配置
TOKEN_SECRET = os.environ.get("TOKEN_SECRET", "wo-ming-you-tian-ting-hao-de-2026")
TOKEN_EXPIRE_DAYS = 30

# DeepSeek API
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")

# 排盘引擎路径（复用已有引擎）
ENGINE_PATH = PROJECT_ROOT / "engine"
TEMPLATES_PATH = PROJECT_ROOT / "report" / "templates"
PROMPTS_PATH = PROJECT_ROOT / "report" / "prompts"
EXAMPLES_PATH = PROJECT_ROOT / "report" / "examples"
