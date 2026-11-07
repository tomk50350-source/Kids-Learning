# 运行与部署

项目提供本地 Node.js 服务和两种 Docker 配置。当前支持可信本机上的成人开发测试，不提供面向公众的部署方案。

## Node.js 本地运行

需要 Node.js 22+ 和 npm：

```sh
npm ci
npm run build
npm run start:local
```

浏览器打开 <http://127.0.0.1:8787>。默认不启用语音；`start:local` 不自动读取 `.env` 文件。

需要测试语音时，按 [API-LOCAL.md](API-LOCAL.md) 配置本机 `.env`，使用 `npm run start:configured` 启动。该模式会读取 `.env`。页面与 API 必须通过同一个 Node.js 服务访问。

## Docker 本地运行

### 课程界面与语音后端

```sh
docker compose -f compose.voice.yaml up --build -d
```

打开 <http://127.0.0.1:8787>。Compose 从本地源码构建 `Dockerfile.voice`，语音默认关闭。完整配置、安全边界和检查方法见 [CONTAINER-RELEASE.md](CONTAINER-RELEASE.md)。

停止并移除该 Compose 服务：

```sh
docker compose -f compose.voice.yaml down
```

### 纯静态图文预览

```sh
docker compose up --build -d
```

打开 <http://127.0.0.1:8080>。此配置使用 `Dockerfile` 和 Nginx，仅提供静态课程界面，不包含实时语音后端。Nginx 配置禁用麦克风、摄像头和定位权限。

停止服务：

```sh
docker compose down
```

语音容器的 CI 结果不覆盖这套独立的静态 Nginx 配置。

## 开发预览

`npm run dev` 启动 Vite 开发服务，适合调整界面。实时语音测试应使用构建后的 Node.js 服务；Vite 不提供 `/api/voice/*` 接口，也没有跨端口代理配置。

## 网络与数据

- 保持 Compose 的 `127.0.0.1` 端口绑定，不改成 `0.0.0.0` 或省略绑定地址。
- 当前服务没有用户登录或远程访问控制，不支持通过公网代理、隧道或路由器端口转发共享。
- 未来的远程部署需要独立的 HTTPS、鉴权、服务端会话控制和安全评估，不能仅修改端口绑定。
- 完成记录保存在浏览器 localStorage 中。清理浏览器数据会清除记录；不同浏览器、设备或访问地址不共享进度。
- 实时语音连接会将麦克风音频传给 OpenAI 并可能产生费用。当前仅供成人使用虚构内容测试，不允许儿童参与或传输真实儿童资料。
