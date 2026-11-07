# Kids Learning · 探索伙伴

交互式启蒙课程原型，包含科学、数学、英语各 10 节活动。课程采用情境图示、选择题、动手活动和生活迁移流程。

项目使用 React、Vite 和 Node.js，提供无需 API key 的图文课程预览，以及实验性的 OpenAI Realtime 语音接入。

> 当前为开发预览版，仅供成人使用虚构情景测试。真实儿童使用尚未开放；实时语音默认关闭，尚未完成真实音频端到端验证。

## 实现范围

- 30 节结构化课程，每课包含引入、点选、解释、动手活动、生活迁移和完成确认。
- 科学主题场景、数学点数图示、英语图文选项。
- 课程选择、目标与安全提示、本地完成记录。
- 基于 WebRTC 的实时语音适配，默认模型为 `gpt-realtime-2.1-mini`。
- 本地 Node.js 服务和 Docker 构建配置。

完成记录仅保存在当前浏览器，不跨设备同步，也不用于评价学习掌握程度。课程内容与教学边界见 [课程说明](LESSON-AUDIT.md)。

## 架构与目录

- `src/App.jsx`：课程界面、选择与完成流程。
- `src/curriculum.json`、`src/engine.mjs`：课程数据、结构校验与本地进度逻辑。
- `src/LessonVisual.jsx`、`public/assets/`：教学图示与视觉资源。
- `src/realtime-client.mjs`：WebRTC 连接、音频事件与课程阶段工具处理。
- `server/index.mjs`、`server/lesson-session.mjs`：同源 HTTP 服务、请求校验和课程会话配置。
- `worker/`、`scripts/prepare-sites-build.mjs`：静态托管构建支持。
- `tests/`：课程、静态托管和语音模拟测试。

本地运行时由 Node.js 提供 `dist/client` 页面和 `/api/voice/*` 接口。语音会话初始化由服务端调用 OpenAI；麦克风与模型音频通过浏览器和 OpenAI 之间的 WebRTC 连接传输。API key 仅由服务端持有。模型可请求切换课程阶段，完成记录仍由界面的手动确认写入。

## 快速开始

需要 Git、Node.js 22+ 和 npm：

```sh
git clone https://github.com/tomk50350-source/Kids-Learning.git
cd Kids-Learning
npm ci
npm run build
npm run start:local
```

打开 <http://127.0.0.1:8787>。无需配置密钥即可浏览图文课程。

## 语音配置

配置项与接口契约见 [API-LOCAL.md](API-LOCAL.md)。语音模式从本机 `.env` 读取服务端配置：

```sh
cp .env.example .env
# 编辑 .env 后启动
npm run start:configured
```

| 配置项 | 默认值 | 用途 |
| --- | --- | --- |
| `OPENAI_API_KEY` | 空 | 服务端 API key |
| `OPENAI_REALTIME_ENABLED` | `false` | 显式启用语音 |
| `ADULT_TEST_MODE` | `false` | 成人虚构情景测试开关 |
| `OPENAI_REALTIME_MODEL` | `gpt-realtime-2.1-mini` | Realtime 模型 |
| `OPENAI_REALTIME_VOICE` | `marin` | 输出音色 |
| `LOCAL_PORT` | `8787` | 本地端口 |

两个测试开关都必须严格设为 `true`，页面确认后才会尝试连接。连接会申请麦克风权限，将音频发送给 OpenAI，可能产生 API 费用。测试仅允许成人声音与虚构内容，不得包含真实儿童信息。`start:local` 不自动读取 `.env`；`start:configured` 会读取。

密钥仅通过服务端环境变量读取，不应写入前端代码或提交到版本控制。服务仅支持可信本机访问，暂不支持局域网或公网部署。

## Docker

```sh
docker compose -f compose.voice.yaml up --build -d
```

访问地址仍为 <http://127.0.0.1:8787>。停止服务：

```sh
docker compose -f compose.voice.yaml down
```

`linux/amd64` 构建与无密钥容器检查已通过 CI。当前尚未发布可直接拉取的预构建镜像；安装步骤与验证范围见 [Docker 说明](CONTAINER-RELEASE.md)。

## 开发与检查

```sh
npm run build
npm run test:curriculum
npm run test:sites
npm run test:voice
npm audit --audit-level=moderate
```

语音测试使用模拟网络与麦克风，不调用收费 API。

`npm run dev` 用于 Vite 界面开发，不提供语音后端。语音集成测试须通过构建后的 Node.js 同源服务运行。

## 开发约束与后续工作

开发与 AI agent 修改指南见 [AGENTS.md](AGENTS.md)。涉及界面、协议、课程或容器的改动应运行对应测试，并同步更新文档。

- 保持语音默认关闭、密钥仅在服务端、本机端口绑定和手动完成确认。
- 真实语音的模型权限、麦克风、音频播放、打断与工具行为仍需独立端到端测试。
- 预构建镜像发布及其他 CPU 架构验证尚未完成。
- 远程访问需要增加鉴权、HTTPS 与服务端会话控制。
- 儿童使用需要完成数据保护配置、监护同意和适龄安全评估；目前不提供儿童启用开关。

## 文档

- [运行与部署](DEPLOYMENT.md)
- [语音配置与接口](API-LOCAL.md)
- [实时语音功能与限制](LOCAL-VOICE-STATUS.md)
- [课程内容与教学边界](LESSON-AUDIT.md)
- [功能状态](V1-STATUS.md)
- [依赖安全说明](SECURITY-DEPENDENCIES.md)
