# 本地实时语音接口（仅供成人使用虚构情景测试）

## 已做与未做

- 30 节现有课程（科学、数学、英语各 10 节）复用同一语音连接，服务器根据有效 `lessonId` 读取审核后的课程内容。
- 实现 **OpenAI Realtime GA 的 WebRTC unified interface**，固定请求 `https://api.openai.com/v1/realtime/calls`。默认模型 **`gpt-realtime-2.1-mini`**，默认音色 `marin`。这不是 GPT-Live-1 集成；后者使用独立的 Live API，不能只把模型名改成 `gpt-live-1`。
- 不使用录音素材、浏览器合成配音或假装 API 成功的备用声音。没有密钥时正常使用无语音课堂，语音连接保持关闭。
- 本次开发只做离线注入假响应测试，**未配置真实密钥、未发起真实 OpenAI 会话、未验证模型访问权限、真实延迟、音质、模型工具行为或实际账单**。
- 不是可公开发布的儿童产品。真实儿童语音目前不开放，也不存在可把儿童模式直接打开的环境变量。

官方 [WebRTC 接入文档](https://developers.openai.com/api/docs/guides/voice-webrtc?voice-api=realtime) 与 [Create call 参数](https://developers.openai.com/api/reference/resources/realtime/subresources/calls/methods/create) 已于 2026-11-06 核对：服务端用标准 API key 把 SDP 和会话配置放入 multipart 请求，向浏览器返回 SDP answer。使用 GA 结构，不发送旧的 `OpenAI-Beta` 头。

## 本地运行

需要 Node.js 22+（本次测试：24.22.1），无需新增服务器依赖。使用仓库现有 `npm install` / `npm run build` 生成 `dist/client` 后：

```sh
# 无真实密钥、默认关闭的本地预览
node server/index.mjs
# 打开 http://127.0.0.1:8787
```

以后有明确授权的成人测试时，由开发者在本机私密环境中配置，不在聊天、浏览器、源码、Vite 变量或公开仓库中粘贴密钥：

```sh
cp .env.example .env
# 在本机编辑 .env。必须设置服务器端 OPENAI_API_KEY，
# 以及 OPENAI_REALTIME_ENABLED=true 和 ADULT_TEST_MODE=true。
node --env-file=.env server/index.mjs
```

普通 Node 模式仅监听 `127.0.0.1`，默认端口 8787；`LOCAL_PORT` 可设为 1024–65535。不要放在公网反向代理、LAN 代理或隧道后，也不要把 `.env` 打包。现有 Sites 静态部署和 Vite 开发服务**不会自动拥有这个接口**。本地需要从此 Node 服务访问构建后的同源页面。不要为了让网页能连接而放宽 Host / Origin 校验。

容器桥接网络需要另设 `LOCAL_CONTAINER_MODE=true`，此时进程在**容器内部**监听 `0.0.0.0`，只为接受 Docker 网关转发；宿主机端口必须显式发布成 **`127.0.0.1:8787:8787`**，不能用 `8787:8787` 或 `-p 8787:8787`。仅在隔离、可信的本机容器网络使用，不要把服务接入不可信容器网络，不使用 host networking，也不在普通宿主机 Node 进程开启此开关。容器模式会跳过 socket loopback 检查，但 Host 与 Origin 仍严格限定同一本机端口。Host/Origin 不能代替宿主机的 loopback 端口绑定，恶意非浏览器客户端可以伪造它们。

启动与检查状态都不会调用 OpenAI。只有所有开关与密钥配置有效、页面确认成人虚构测试、用户明确点击连接后才尝试创建收费会话。`ready: true` 只代表本地配置齐全，并不验证余额、密钥真实性或账户权限。

环境变量：

| 名称 | 默认值 | 含义 |
| --- | --- | --- |
| `OPENAI_API_KEY` | 空 | 只保留在服务器进程环境；不会返回给浏览器 |
| `OPENAI_REALTIME_ENABLED` | `false` | 必须严格等于字符串 `true` |
| `ADULT_TEST_MODE` | `false` | 必须严格等于字符串 `true`，仅成人虚构情景测试 |
| `OPENAI_REALTIME_MODEL` | `gpt-realtime-2.1-mini` | 只允许 `gpt-realtime-2.1-mini`、`gpt-realtime-2.1`、`gpt-realtime-2`、`gpt-realtime-1.5` |
| `OPENAI_REALTIME_VOICE` | `marin` | 只允许官方内置音色，不接受客户端覆盖 |
| `LOCAL_PORT` | `8787` | 本地同源端口；不能启用 LAN 访问 |
| `LOCAL_CONTAINER_MODE` | `false` | 仅容器桥接模式设 `true`；宿主机端口必须只发布到 `127.0.0.1` |

## HTTP 合同

浏览器应直接请求同源 `/api/...`。POST 必须带实际同源 Origin；不提供 CORS，也不接受跨端口开发页面。

### `GET /api/voice/status`

不调用 OpenAI。只返回布尔配置状态，不返回密钥、模型、原始环境值、错误堆栈或用户资料：

```json
{
  "enabled": false,
  "configured": false,
  "adultTestMode": false,
  "configurationValid": true,
  "ready": false,
  "childUseAllowed": false
}
```

前端以 `ready` 决定是否可以连接。`childUseAllowed` 永远为 `false`，成人测试不等于儿童使用授权。

### `POST /api/voice/session`

`Content-Type: application/json`，仅允许以下三个字段：

```json
{
  "lessonId": "science-01",
  "sdp": "v=0\r\n...browser RTCPeerConnection offer...",
  "adultTestConfirmed": true
}
```

成功返回 `201`、`Content-Type: application/sdp`，body 是原始 SDP answer。没有 API key、client secret、call ID 或任意上游响应透传。客户端把 answer 设为 remote description。麦克风音频随后通过 WebRTC **直接传给 OpenAI**，不是只在本机处理。

失败统一为 `{"error":{"code":"...","message":"..."}}`，不返回上游原始错误：

- `400`：无效 JSON、字段、课程或 SDP；不接受自定义 instructions、model、voice、儿童模式等额外字段。
- `403`：Host / Origin / 连接地址不是受支持的同源本机请求，或没有成人测试确认。
- `405` / `415`：请求方法或媒体类型不支持。
- `408` / `413`：请求体接收超时或超出限制。
- `429`：单进程每 60 秒最多 3 次有效会话创建尝试，同时最多 1 个创建请求；返回 `Retry-After: 60`。
- `503`：未启用、未配置密钥或配置无效。
- `502` / `504`：服务商错误、网络失败、无效 answer 或 15 秒初始化超时。

## WebRTC 客户端与课程阶段

客户端创建音轨和 `oai-events` data channel。通道开启后发送一次 `response.create`，让 AI 主动开场。不要每次事件都发送，避免重复生成。服务端配置音频输出、Server VAD（900ms 静音）与打断，但 **`create_response:false`**，不由 VAD 自动生成回复。客户端等待 `input_audio_buffer.committed` 确认当前用户音频已提交后，通过同一 busy/queue 调度器请求回复；初次开场、手动选择、工具结果和语音回复均由这个调度器串行处理。服务端不另开输入转写模型。

模型获得只读课程内容，短句中文引导，每轮一个问题并等待；英语课程带目标英文。课程阶段通过唯一工具 `set_lesson_phase` 提示界面：

```json
{"phase": 2}
```

`phase` 必须是 0–5 的整数，禁止额外参数：0 引入、1 选择题等待回答、2 简短解释、3 现实亲子活动（成人模拟测试）、4 生活迁移、5 讲完请求手动确认。phase5 保留 phase4 画面并提示用户自行确认。客户端仅处理明确的 `response.function_call_arguments.done`，校验工具名、JSON 和整数范围，并用原 `call_id` 返回 `conversation.item.create` / `function_call_output`。工具回应需要继续说话时，在当前响应已结束后发送 `response.create`，避免 `conversation_already_has_active_response`。重复工具事件应去重。

阶段只是授课位置，不是正确率、发展评估或掌握证明。模型不能替用户点击完成、写学习记录，阶段5也不能自动写入持久化完成记录。完成仍由用户手动确认。提示词不是可靠的安全防线；模型仍可能出错，真实教学效果需要单独评估。[Realtime 客户端事件](https://developers.openai.com/api/reference/resources/realtime/client-events) 说明了数据通道事件结构。

## 本地保护与已知边界

- Host 仅允许配置端口的 `127.0.0.1`、`localhost`、`[::1]`；普通模式监听 IPv4 loopback。POST Origin 必须与 Host 完全一致；拒绝 cross-site fetch，忽略代理来源声明；普通模式检查 socket remote address。显式容器模式只为桥接网络跳过 socket 检查，必须依靠宿主机 `127.0.0.1` 端口发布隔离，不能公开发布。
- 请求体最多 64 KiB，SDP 最多 48 KiB，上游 answer 最多 128 KiB；不接受压缩请求；15 秒上游初始化超时。固定官方 HTTPS 地址，禁止跟随重定向。
- 服务端不写音频、转写、SDP、会话内容或用户资料到磁盘，也不记录请求/错误详情。应用内临时字幕与事件仍需客户端在结束时清除；不要增加分析 SDK、录音或事件日志。
- 静态服务根目录固定为 `dist/client`，拒绝 dotfiles 与跨根目录 symlink，不提供 `.env`、源码或任意文件下载。
- 使用 Node 导出的 `createRequestHandler({env, fetchImpl, staticRoot, now, upstreamTimeoutMs})` 便于离线测试。这些是本机可信代码注入参数，不是 HTTP API 字段。
- 客户端须在5分钟、退出、切课、连接失败、页面离开或用户点击结束时关闭 peer connection，停止所有麦克风 track，清理 data channel 和远程音频。客户端计时器可能被后台冻结或人为绕过，**不是服务器强制会话上限**。
- `max_output_tokens=384` 只限制单次模型回复，不限制输入音频、多个回复或总会话开销。会话创建限流、客户端5分钟计时与 token 限制都**不是费用硬上限**；不能据此承诺固定账单。
- 这是可信本机成人开发测试服务，不带用户登录、可执行的年龄核验或可靠的儿童检测。勾选成人测试是一项使用约定，不是技术年龄证明。知道本地接口的恶意本机程序仍可能使用已配置密钥创建会话。初始化后客户端可以向 Realtime 发送事件，也不应把浏览器当成可信的政策或预算执行端。面向不可信用户需要独立鉴权、服务器会话控制与退出策略、监控和安全评估；参见 [Server-side controls](https://developers.openai.com/api/docs/guides/voice-server-controls?voice-api=realtime)。

## 儿童数据与上线前置条件

[OpenAI under-18 guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance) 要求服务未成年人的产品增加适龄安全措施，并指出处理13岁以下或当地数字同意年龄以下儿童的个人数据前，需要先实施 Zero Data Retention。儿童声音和谈话可能涉及个人信息，不能以“无本地录音”“家长勾选”或“不问姓名”替代数据保护要求。

[OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data) 列明了不同端点的保留与 ZDR 适用情况。ZDR 需要合资格审批与实际组织/项目设置，不是代码里写一个变量或 `store:false` 就能取得；本地不存内容也不代表提供商不保留数据。

因此本版本**不提供真实儿童启用开关**。以后必须另行验证组织/项目获批并有效启用的 ZDR、选用端点/模型适用性、监护同意与隐私说明、适用儿童保护法律、适龄安全评估与事故处置；由有资格的负责人完成审查并修改/验证产品后才能开放。成人测试应使用自己的声音、虚构角色和虚构回答，不让儿童参与或说出真实儿童资料。

## 测试

```sh
node --test tests/realtime-server.test.mjs
```

全部上游请求使用注入 fake fetch；只启动本机 HTTP 测试服务器，不读真实密钥、不联网 OpenAI、不触发付费使用。覆盖默认拒绝、严格开关、儿童模式不可启用、Origin/Host、请求限制、30课程提示、工具schema、上游错误脱敏/超时、限流、并发和静态文件访问边界。真实麦克风与付费端到端验收需要之后单独授权。
