"""
设置 API 路由

包含模型提供商配置和用户管理接口。

Author: chunlin
"""

from typing import List, Optional
from datetime import datetime
import hashlib
import secrets

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr

from database.models import ModelProvider, ProviderModel, User

router = APIRouter(prefix="/settings", tags=["settings"])


# ============== 请求/响应模型 ==============

# --- Provider ---
class ModelProviderCreate(BaseModel):
    name: str
    description: Optional[str] = None
    api_key: str
    api_base: Optional[str] = None
    config: dict = {}


class ModelProviderUpdate(BaseModel):
    description: Optional[str] = None
    api_key: Optional[str] = None
    api_base: Optional[str] = None
    enabled: Optional[bool] = None
    config: Optional[dict] = None


class ProviderModelResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    model_type: str
    enabled: bool
    config: dict
    created_at: datetime


class ModelProviderResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    api_base: Optional[str]
    enabled: bool
    config: dict
    models: List[ProviderModelResponse] = []
    created_at: datetime
    updated_at: datetime


# --- Model ---
class ProviderModelCreate(BaseModel):
    name: str
    description: Optional[str] = None
    model_type: str  # llm, embedding, rerank, tts
    config: dict = {}


class ProviderModelUpdate(BaseModel):
    description: Optional[str] = None
    enabled: Optional[bool] = None
    config: Optional[dict] = None


# ... User models ...
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None
    role: str = "user"


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    name: Optional[str]
    role: str
    is_active: bool
    last_login_at: Optional[datetime]
    created_at: datetime


# ... Utils ...
def hash_password(password: str) -> str:
    """简单密码哈希（生产环境请使用 bcrypt）"""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}:{hashed}"


def verify_password(password: str, password_hash: str) -> bool:
    """验证密码"""
    salt, hashed = password_hash.split(":")
    return hashlib.sha256((password + salt).encode()).hexdigest() == hashed


# ============== 模型提供商 API ==============

@router.get("/model-providers", response_model=List[ModelProviderResponse])
async def list_model_providers(model_type: str = None):
    """
    获取所有模型提供商及其模型
    
    Args:
        model_type: 可选，按模型类型筛选 (llm, embedding, rerank, tts)
    """
    providers = await ModelProvider.all().prefetch_related("models").order_by("name")
    
    results = []
    for p in providers:
        # 筛选模型
        filtered_models = p.models
        if model_type:
            filtered_models = [m for m in p.models if m.model_type == model_type]
        
        # 如果指定了 model_type 但该提供商没有匹配的模型，跳过
        if model_type and not filtered_models:
            continue
        
        models = [
            ProviderModelResponse(
                id=m.id,
                name=m.name,
                description=m.description,
                model_type=m.model_type,
                enabled=m.enabled,
                config=m.config,
                created_at=m.created_at
            ) for m in filtered_models
        ]
        results.append(ModelProviderResponse(
            id=p.id,
            name=p.name,
            description=p.description,
            api_base=p.api_base,
            enabled=p.enabled,
            config=p.config,
            models=models,
            created_at=p.created_at,
            updated_at=p.updated_at
        ))
    return results


@router.post("/model-providers", response_model=ModelProviderResponse)
async def create_model_provider(payload: ModelProviderCreate):
    """创建或更新模型提供商（仅凭证）"""
    existing = await ModelProvider.filter(name=payload.name).first()
    if existing:
        existing.api_key = payload.api_key
        existing.api_base = payload.api_base
        existing.config = payload.config
        if payload.description is not None:
             existing.description = payload.description
        await existing.save()
        provider = existing
    else:
        provider = await ModelProvider.create(
            name=payload.name,
            description=payload.description,
            api_key=payload.api_key,
            api_base=payload.api_base,
            config=payload.config
        )
    
    # Reload to get empty models list
    await provider.fetch_related("models")
    
    return ModelProviderResponse(
        id=provider.id,
        name=provider.name,
        description=provider.description,
        api_base=provider.api_base,
        enabled=provider.enabled,
        config=provider.config,
        models=[], 
        created_at=provider.created_at,
        updated_at=provider.updated_at
    )


@router.put("/model-providers/{provider_id}", response_model=ModelProviderResponse)
async def update_model_provider(provider_id: int, payload: ModelProviderUpdate):
    """更新模型提供商"""
    provider = await ModelProvider.get_or_none(id=provider_id).prefetch_related("models")
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    if payload.api_key is not None:
        provider.api_key = payload.api_key
    if payload.api_base is not None:
        provider.api_base = payload.api_base
    if payload.enabled is not None:
        provider.enabled = payload.enabled
    if payload.config is not None:
        provider.config = payload.config
    if payload.description is not None:
        provider.description = payload.description
    
    await provider.save()
    
    # Construct response manually to include models
    models = [
        ProviderModelResponse(
            id=m.id,
            name=m.name,
            description=m.description,
            model_type=m.model_type,
            enabled=m.enabled,
            config=m.config,
            created_at=m.created_at
        ) for m in provider.models
    ]
    
    return ModelProviderResponse(
        id=provider.id,
        name=provider.name,
        description=provider.description,
        api_base=provider.api_base,
        enabled=provider.enabled,
        config=provider.config,
        models=models,
        created_at=provider.created_at,
        updated_at=provider.updated_at
    )


@router.delete("/model-providers/{provider_id}")
async def delete_model_provider(provider_id: int):
    """删除模型提供商"""
    provider = await ModelProvider.get_or_none(id=provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    await provider.delete()
    return {"message": "Deleted successfully"}


# ============== 具体模型管理的 API ==============

@router.post("/model-providers/{provider_id}/models", response_model=ProviderModelResponse)
async def create_provider_model(provider_id: int, payload: ProviderModelCreate):
    """向提供商添加模型"""
    provider = await ModelProvider.get_or_none(id=provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    # 检查重名
    existing = await ProviderModel.filter(
        provider=provider, name=payload.name, model_type=payload.model_type
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Model already exists")

    model = await ProviderModel.create(
        provider=provider,
        name=payload.name,
        description=payload.description,
        model_type=payload.model_type,
        config=payload.config
    )
    
    return ProviderModelResponse(
        id=model.id,
        name=model.name,
        description=model.description,
        model_type=model.model_type,
        enabled=model.enabled,
        config=model.config,
        created_at=model.created_at
    )


@router.put("/models/{model_id}", response_model=ProviderModelResponse)
async def update_provider_model(model_id: int, payload: ProviderModelUpdate):
    """更新模型配置"""
    model = await ProviderModel.get_or_none(id=model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    if payload.description is not None:
        model.description = payload.description
    if payload.enabled is not None:
        model.enabled = payload.enabled
    if payload.config is not None:
        model.config = payload.config
        
    await model.save()
    
    return ProviderModelResponse(
        id=model.id,
        name=model.name,
        description=model.description,
        model_type=model.model_type,
        enabled=model.enabled,
        config=model.config,
        created_at=model.created_at
    )


@router.delete("/models/{model_id}")
async def delete_provider_model(model_id: int):
    """删除模型"""
    model = await ProviderModel.get_or_none(id=model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
        
    await model.delete()
    return {"message": "Deleted successfully"}


# ============== 用户管理 API ==============

@router.get("/users", response_model=List[UserResponse])
async def list_users():
    """获取所有用户"""
    users = await User.all().order_by("-created_at")
    return [
        UserResponse(
            id=u.id,
            email=u.email,
            name=u.name,
            role=u.role,
            is_active=u.is_active,
            last_login_at=u.last_login_at,
            created_at=u.created_at
        )
        for u in users
    ]


@router.post("/users", response_model=UserResponse)
async def create_user(payload: UserCreate):
    """创建用户"""
    # 检查邮箱是否已存在
    existing = await User.filter(email=payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    user = await User.create(
        email=payload.email,
        password_hash=hash_password(payload.password),
        name=payload.name,
        role=payload.role
    )
    
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        is_active=user.is_active,
        last_login_at=user.last_login_at,
        created_at=user.created_at
    )


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, payload: UserUpdate):
    """更新用户"""
    user = await User.get_or_none(id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if payload.name is not None:
        user.name = payload.name
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.password is not None:
        user.password_hash = hash_password(payload.password)
    
    await user.save()
    
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        is_active=user.is_active,
        last_login_at=user.last_login_at,
        created_at=user.created_at
    )


@router.delete("/users/{user_id}")
async def delete_user(user_id: int):
    """删除用户"""
    user = await User.get_or_none(id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await user.delete()
    return {"message": "Deleted successfully"}
