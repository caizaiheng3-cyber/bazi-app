# 八字命理 Web 应用 - 云服务器部署指南

## 第一步：购买阿里云服务器

### 1.1 打开购买页面

浏览器访问：https://www.aliyun.com/product/swas

选择 **轻量应用服务器**（比 ECS 操作更简单，适合个人项目）

### 1.2 推荐配置

| 配置项 | 推荐选择 |
|---|---|
| 地域 | 华东1（杭州）或华东2（上海） |
| 镜像 | **系统镜像 → Ubuntu 22.04** |
| 套餐 | 2核2G 60GB（约 ¥54/月）或 2核4G（更稳） |
| 数据盘 | 默认即可（系统盘 60GB 够用） |
| 购买时长 | 建议先买 1 个月测试 |

### 1.3 设置密码

购买时设置 root 密码（记住它，后面要用）

### 1.4 开放端口

购买完成后，进入服务器管理控制台：

1. 左侧菜单 → **安全** → **防火墙**
2. 添加规则：**端口 80（HTTP）**
3. 如果后续要用 HTTPS，再添加 **端口 443**

记下服务器的 **公网 IP 地址**（如 `47.96.xxx.xxx`）

---

## 第二步：连接服务器

在你的 Mac 终端执行：

```bash
ssh root@你的公网IP
```

首次连接输入 `yes` 确认，然后输入购买时设置的密码。

---

## 第三步：安装 Docker

连接到服务器后，依次执行以下命令：

```bash
# 更新系统
apt update && apt upgrade -y

# 一键安装 Docker
curl -fsSL https://get.docker.com | sh

# 启动 Docker
systemctl start docker
systemctl enable docker

# 验证安装
docker --version
docker compose version
```

---

## 第四步：上传项目代码

### 方式一：Git 拉取（推荐）

如果项目已推送到 Git 仓库：

```bash
# 在服务器上
apt install -y git
cd /opt
git clone 你的仓库地址 bazi-app
cd bazi-app
```

### 方式二：scp 直接上传

在你的 **Mac 本地终端**执行：

```bash
# 先排除不需要的文件，打包项目
cd /Users/caizaiheng/vscode/八字项目
tar --exclude='node_modules' \
    --exclude='.venv' \
    --exclude='__pycache__' \
    --exclude='.git' \
    --exclude='命理案例' \
    --exclude='web/backend/data' \
    --exclude='web/frontend/dist' \
    -czf /tmp/bazi-app.tar.gz .

# 上传到服务器
scp /tmp/bazi-app.tar.gz root@你的公网IP:/opt/

# 在服务器上解压
ssh root@你的公网IP
mkdir -p /opt/bazi-app && cd /opt/bazi-app
tar -xzf /opt/bazi-app.tar.gz
```

---

## 第五步：配置环境变量

```bash
cd /opt/bazi-app/deploy

# 从模板创建配置文件
cp .env.example .env

# 编辑配置
nano .env
```

必须修改的配置：

```
DEEPSEEK_API_KEY=sk-你的真实密钥
AUTH_PASSWORD=你想设置的登录密码
TOKEN_SECRET=随便输入一串随机字符（如：a8f3k2m9x7p1q4w6）
```

保存退出：`Ctrl+O` 回车保存，`Ctrl+X` 退出。

---

## 第六步：一键部署

```bash
cd /opt/bazi-app/deploy
bash deploy.sh
```

等待 3-5 分钟（首次构建需要下载依赖），看到以下输出即成功：

```
✅ 部署完成！
🌐 访问地址: http://47.96.xxx.xxx
```

---

## 第七步：验证

在浏览器中访问：`http://你的公网IP`

应该能看到登录页面，输入你在 `.env` 中设置的密码即可登录。

---

## 常用运维命令

```bash
cd /opt/bazi-app/deploy

# 查看运行状态
docker compose ps

# 查看实时日志
docker compose logs -f

# 只看后端日志
docker compose logs -f backend

# 重启服务
docker compose restart

# 停止服务
docker compose down

# 更新代码后重新部署
docker compose build --no-cache && docker compose up -d

# 备份数据库
docker cp bazi-backend:/app/web/backend/data/app.db ./backup_$(date +%Y%m%d).db
```

---

## 常见问题

### Q: 访问超时/无法访问？
1. 检查防火墙是否开放了 80 端口
2. `docker compose ps` 确认容器都在运行
3. `docker compose logs` 查看是否有报错

### Q: 报告生成失败？
检查 DEEPSEEK_API_KEY 是否正确配置：
```bash
docker compose exec backend env | grep DEEPSEEK
```

### Q: 如何更换密码？
```bash
nano /opt/bazi-app/deploy/.env
# 修改 AUTH_PASSWORD
docker compose restart backend
```
