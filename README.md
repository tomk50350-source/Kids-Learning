# kids-learning

探索伙伴课程原型：科学、数学、英语各 10 节，共 30 节原创活动草稿。

## 当前版本

包含可独立预览的课程界面，以及本地 Node 服务和 OpenAI Realtime GA
WebRTC 接口适配。默认模型为 `gpt-realtime-2.1-mini`，不是 GPT-Live-1。

**当前只允许成年人使用虚构情景测试。真实儿童使用未开放。**
语音默认关闭；填写 key 不等于完成儿童产品、数据合规或上线验收。
自动化测试使用模拟网络、麦克风和模型响应，没有验证真实 API 音频效果。

## 无密钥本地预览

需要 Node.js 22+ 和 npm：

```sh
npm ci
npm run build
npm run start:local
```

打开 `http://127.0.0.1:8787`。没有 key 时可使用静音课堂，语音连接保持关闭。

## 成人实时语音测试

先阅读 [API-LOCAL.md](API-LOCAL.md) 中的数据传输、收费和安全边界。
只在可信本机把 `.env.example` 复制为 `.env`，在该本地文件中填写
`OPENAI_API_KEY`，并明确选择 `OPENAI_REALTIME_ENABLED=true` 和
`ADULT_TEST_MODE=true`，然后运行：

```sh
npm run start:configured
```

页面确认成人虚构测试并点击连接后，麦克风音频会直接发送给 OpenAI，
可能产生费用。请勿让儿童参与或输入真实儿童资料。
API key 只在本地服务端读取，不要放入聊天、浏览器前端或 GitHub。

## 检查

```sh
npm run build
npm run test:curriculum
npm run test:sites
npm run test:voice
```

## Docker 与发布状态

- `Dockerfile` / `compose.yaml`：旧的静音静态网页构建方案。
- `Dockerfile.voice` / `compose.voice.yaml`：新的本机成人测试服务构建方案。
- 容器方案尚未完成实际 Docker 构建、镜像发布及拉取验收。
- 当前没有可供直接拉取的已验证镜像；源码上传不等于 V1 交付完成。

详见 [CONTAINER-RELEASE.md](CONTAINER-RELEASE.md) 和
[LOCAL-VOICE-STATUS.md](LOCAL-VOICE-STATUS.md)。不要公开端口或更改为公网部署。

## 数据与课程

完成进度仅保存在当前浏览器，不跨设备同步，也不代表学习掌握程度。
所有课程都需家长评估适龄性并监督动手活动。
课程审核见 [LESSON-AUDIT.md](LESSON-AUDIT.md)，完整状态见
[V1-STATUS.md](V1-STATUS.md)。

仓库不应存放 API key、密码、真实 `.env`、真实儿童资料、依赖目录、
构建输出或录音。即使仓库私有，也不要用 Git 保存秘密。

公开源码中的 `.openai/hosting.json` 未绑定任何既有 Sites 项目。
本地构建与 Node 服务不依赖该项目标识；源码公开不会自动公开或更新原托管站点。
