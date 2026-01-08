# Aerich 数据库迁移使用指南

## 环境准备

```bash
cd fastapi_llmops
source .venv/bin/activate
```

---

## 常用命令

### 1. 生成迁移文件（模型变更后）

```bash
aerich migrate --name "add_published_field"
```

这会根据 `app/db/models.py` 的变更自动生成迁移 SQL。

### 2. 应用迁移到数据库

```bash
aerich upgrade
```

### 3. 查看迁移历史

```bash
aerich history
```

### 4. 回滚迁移

```bash
aerich downgrade
```

### 5. 查看当前版本

```bash
aerich heads
```

---

## 完整工作流示例

```bash
# 1. 修改 app/db/models.py（例如添加新字段）

# 2. 生成迁移文件
aerich migrate --name "add_new_field"

# 3. 检查生成的迁移文件
ls migrations/models/

# 4. 应用迁移
aerich upgrade

# 5. 确认迁移成功
aerich history
```

---

## 迁移文件位置

```
migrations/models/
├── 0_20260108_初始化.py
├── 1_20260108_add_published_field.py
└── ...
```

---

## 注意事项

1. **首次使用**：已执行 `aerich init-db`，无需再次初始化
2. **生产环境**：先在测试环境验证迁移
3. **回滚**：使用 `aerich downgrade` 可回滚最近一次迁移
4. **删除表/字段**：生成迁移前备份数据
