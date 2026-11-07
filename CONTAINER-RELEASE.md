# Docker 构建与运行

`Dockerfile.voice` 和 `compose.voice.yaml` 提供课程界面及本地语音后端。当前从源码构建，尚未发布可直接拉取的预构建镜像。

## 无密钥启动

需要 Docker 和 Docker Compose。首次构建需要联网下载官方 Node.js 基础镜像与 npm 依赖。在项目根目录运行：

```sh
docker compose -f compose.voice.yaml up --build -d
```

打开 <http://127.0.0.1:8787>。未配置密钥及成人测试开关时，课程界面可用，语音连接保持关闭。

停止服务：

```sh
docker compose -f compose.voice.yaml down
```

## 配置成人语音测试

先阅读 [语音配置与数据说明](API-LOCAL.md)，再把 `.env.example` 复制为本机 `.env`，配置 `OPENAI_API_KEY`、`OPENAI_REALTIME_ENABLED=true` 和 `ADULT_TEST_MODE=true`。重新运行上述 Compose 启动命令以应用配置。

麦克风仅在页面确认并点击连接后申请使用。音频会发送给 OpenAI，可能产生 API 费用。仅使用成人声音与虚构内容，不让儿童参与或输入真实儿童资料。

密钥通过运行时环境变量传入，不写入镜像。Docker 管理员能够读取容器环境变量，因此只能在可信设备上配置密钥。

## 网络与运行限制

- 宿主机端口固定绑定 `127.0.0.1:8787:8787`，仅允许本机访问。
- 容器内使用 `LOCAL_CONTAINER_MODE=true` 接收 Docker 桥接流量。此开关不用于普通宿主机 Node.js 进程。
- 不使用通配端口发布、host networking、公网代理或不可信的共享容器网络。
- Compose 使用非 root 用户、只读根文件系统、临时 `/tmp`、移除全部 Linux capabilities，并设置 `no-new-privileges`。
- 当前没有远程登录、年龄核验或服务器强制费用上限。局域网和公网访问需要另行设计与安全评估。

## 验证范围

[2026-11-07 的 CI 检查](https://github.com/tomk50350-source/Kids-Learning/actions/runs/42327926134) 针对代码提交 `d78a42f` 通过：

- `linux/amd64` Docker 镜像构建。
- Compose 配置校验。
- 容器首页与状态接口检查。
- 无密钥时语音会话接口返回 `503`。
- 非 root 运行，应用运行目录不包含 `node_modules`。
- 前端构建、51 项自动化测试及 npm 依赖审计。

这些检查没有发布镜像，也没有调用真实语音 API。其他 CPU 架构、真实麦克风与音频、模型访问权限、实际费用及儿童适用性尚未验证。

本机可重复运行无密钥容器检查：

```sh
sh scripts/verify-container.sh
```

脚本构建本地镜像并启动临时容器，完成后移除该容器，不登录镜像仓库或调用 OpenAI。

## 静态网页配置

`Dockerfile` / `compose.yaml` 是独立的 Nginx 静态预览方案，不包含 Node.js 语音接口。使用方法见 [运行与部署](DEPLOYMENT.md)。
