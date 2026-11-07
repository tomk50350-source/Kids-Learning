# 依赖安全说明

本文件说明 npm 依赖更新、检查方法及其范围，不构成完整安全审计。

## 当前基线

[2026-11-07 的 CI](https://github.com/tomk50350-source/Kids-Learning/actions/runs/42327926134) 对代码提交 `d78a42f` 执行了包含开发依赖的 npm 审计，结果为 **0 项已知报告漏洞**。同次运行通过前端构建、51 项自动化测试及无密钥容器检查。

审计结果依赖当时的漏洞数据库，会随新公告变化。它不覆盖未知漏洞、应用逻辑、模型行为、Node.js 基础镜像及操作系统软件包。

## 依赖更新

当前锁文件包含以下更新：

| 依赖 | 更新前 | 更新后 |
| --- | --- | --- |
| Vite | 6.4.2 | 6.4.5 |
| PostCSS | 8.5.16 | 8.5.32 |
| nanoid | 3.3.15 | 3.3.20 |
| source-map-js | 1.2.1 | 1.2.2 |
| Browserslist | 4.28.5 | 4.29.5 |
| baseline-browser-mapping | 2.10.42 | 2.11.35 |

Babel 与 Rollup 的兼容更新记录在 `package-lock.json`。Vite 及 React Vite 插件归入 `devDependencies`；CI 审计仍包含开发依赖，并在发现中等或更高风险公告时失败。

相关公告涉及开发服务器文件访问、源码映射处理、无效输入及资源消耗，例如 [Vite](https://github.com/advisories/GHSA-587h-7wmj-h5pm)、[PostCSS](https://github.com/advisories/GHSA-r28c-9q8g-f849)、[nanoid](https://github.com/advisories/GHSA-28wg-ghj8-5hjv) 和 [source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)。

## 生产运行范围

语音容器仅复制构建后的浏览器资源、Node.js 服务、课程数据和课程逻辑，不复制应用的 `node_modules`。服务端使用 Node.js 内置模块和仓库源码，生产服务不运行 Vite，也不接受用户提交的 CSS 或 source map 进行编译。

这种打包方式减少了上述构建工具在运行时的直接暴露，但构建环境仍需使用已修复的依赖。容器中的 Node.js、系统软件包和全局工具需要单独维护与检查。

## 检查方法

```sh
npm ci
npm audit --audit-level=moderate
npm run build
npm run test:curriculum
npm run test:sites
npm run test:voice
```

修改依赖或容器配置后，可在 Docker 环境运行 `sh scripts/verify-container.sh`。该脚本检查非 root 运行、应用目录不包含 `node_modules`、首页可用及无密钥时语音接口关闭，不调用真实 API。

真实语音测试、远程访问安全和儿童数据保护不属于 npm 依赖审计范围，参见 [语音说明](API-LOCAL.md)。
