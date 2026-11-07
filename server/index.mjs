import http from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSession, getLesson } from './lesson-session.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const UPSTREAM_URL = 'https://api.openai.com/v1/realtime/calls';
const MODELS = new Set(['gpt-realtime-2.1-mini', 'gpt-realtime-2.1', 'gpt-realtime-2', 'gpt-realtime-1.5']);
const VOICES = new Set(['marin', 'cedar', 'alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse']);
const MAX_BODY_BYTES = 64 * 1024;
const MAX_SDP_BYTES = 48 * 1024;
const MAX_ANSWER_BYTES = 128 * 1024;
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

export function readConfig(env = process.env) {
  const portText = env.LOCAL_PORT ?? '8787';
  const port = /^\d{1,5}$/.test(portText) ? Number(portText) : NaN;
  const model = env.OPENAI_REALTIME_MODEL || 'gpt-realtime-2.1-mini';
  const voice = env.OPENAI_REALTIME_VOICE || 'marin';
  const apiKey = (env.OPENAI_API_KEY || '').trim();
  const configurationValid = Number.isInteger(port) && port >= 1024 && port <= 65535
    && MODELS.has(model) && VOICES.has(voice) && !/[\r\n]/.test(apiKey);
  return Object.freeze({
    port, model, voice, apiKey, configurationValid,
    enabled: env.OPENAI_REALTIME_ENABLED === 'true',
    adultTestMode: env.ADULT_TEST_MODE === 'true',
    containerMode: env.LOCAL_CONTAINER_MODE === 'true',
  });
}

export function publicStatus(config) {
  return {
    enabled: config.enabled, configured: Boolean(config.apiKey),
    adultTestMode: config.adultTestMode, configurationValid: config.configurationValid,
    ready: Boolean(config.enabled && config.adultTestMode && config.apiKey && config.configurationValid),
    childUseAllowed: false,
  };
}

class RequestError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function send(res, status, body, type = 'application/json; charset=utf-8', headers = {}) {
  if (res.destroyed || res.writableEnded) return;
  res.writeHead(status, {
    'Content-Type': type, 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Permissions-Policy': 'microphone=(self), camera=(), geolocation=()',
    'X-Frame-Options': 'DENY', ...headers,
  });
  res.end(body);
}

function fail(res, status, code, message, headers) {
  send(res, status, JSON.stringify({ error: { code, message } }), undefined, headers);
}

function validLocalRequest(req, config, requireOrigin) {
  const host = req.headers.host;
  const hosts = new Set([`localhost:${config.port}`, `127.0.0.1:${config.port}`, `[::1]:${config.port}`]);
  // Container bridge traffic originates from the Docker gateway rather than loopback.
  // Only the explicitly selected container entry point may skip the socket check;
  // it must be published as 127.0.0.1:PORT:PORT, never a wildcard host mapping.
  if ((!config.containerMode && !LOOPBACK.has(req.socket.remoteAddress)) || !hosts.has(host)) return false;
  const origin = req.headers.origin;
  if (requireOrigin && !origin) return false;
  if (origin !== undefined && origin !== `http://${host}`) return false;
  if (req.headers['sec-fetch-site'] === 'cross-site') return false;
  return true;
}

async function readJson(req) {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type'] || '')) {
    throw new RequestError(415, 'unsupported_media_type', '请使用 JSON 请求。');
  }
  if (req.headers['content-encoding'] && req.headers['content-encoding'] !== 'identity') {
    throw new RequestError(415, 'unsupported_encoding', '不支持压缩请求。');
  }
  const declared = req.headers['content-length'];
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY_BYTES)) {
    throw new RequestError(413, 'request_too_large', '连接请求过大。');
  }
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    let settled = false;
    const timer = setTimeout(() => finish(new RequestError(408, 'request_timeout', '连接请求接收超时。')), 10_000);
    const finish = (error, body) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      req.removeListener('data', onData);
      req.removeListener('end', onEnd);
      req.removeListener('aborted', onAborted);
      req.removeListener('error', onError);
      if (error) { req.resume(); reject(error); } else resolve(body);
    };
    const onData = chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) finish(new RequestError(413, 'request_too_large', '连接请求过大。'));
      else chunks.push(chunk);
    };
    const onEnd = () => {
      try { finish(null, JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { finish(new RequestError(400, 'invalid_json', '连接请求格式无效。')); }
    };
    const onAborted = () => finish(new RequestError(400, 'request_aborted', '连接请求已取消。'));
    const onError = () => finish(new RequestError(400, 'request_failed', '连接请求未完成。'));
    req.on('data', onData).once('end', onEnd).once('aborted', onAborted).once('error', onError);
  });
}

function validateBody(body) {
  if (!body || Array.isArray(body) || typeof body !== 'object'
    || Object.keys(body).some(key => !['sdp', 'lessonId', 'adultTestConfirmed'].includes(key))) {
    throw new RequestError(400, 'invalid_request', '只接受课程编号、连接描述和成人测试确认。');
  }
  if (body.adultTestConfirmed !== true) {
    throw new RequestError(403, 'adult_confirmation_required', '只允许成年人使用虚构资料测试，请先确认。');
  }
  const lesson = getLesson(body.lessonId);
  if (!lesson) throw new RequestError(400, 'invalid_lesson', '请选择有效课程。');
  if (typeof body.sdp !== 'string' || Buffer.byteLength(body.sdp) > MAX_SDP_BYTES
    || !/^v=0\r?\n/.test(body.sdp) || !/(?:^|\n)m=audio /.test(body.sdp)
    || !/(?:^|\n)a=fingerprint:/.test(body.sdp) || body.sdp.includes('\0')) {
    throw new RequestError(400, 'invalid_sdp', '语音连接描述无效。');
  }
  return lesson;
}

async function readAnswer(response) {
  if (!response.body) throw new Error('missing_response');
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > MAX_ANSWER_BYTES) throw new Error('oversized_response');
    chunks.push(chunk);
  }
  const answer = Buffer.concat(chunks).toString('utf8');
  if (!/^v=0\r?\n/.test(answer) || !/(?:^|\n)m=audio /.test(answer)) throw new Error('invalid_response');
  return answer;
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

async function serveStatic(req, res, url, staticRoot) {
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { return fail(res, 400, 'invalid_path', '地址无效。'); }
  if (pathname.includes('\0') || pathname.includes('\\') || pathname.split('/').some(part => part.startsWith('.'))) {
    return fail(res, 404, 'not_found', '未找到资源。');
  }
  const root = await realpath(staticRoot).catch(() => null);
  if (!root) return fail(res, 503, 'build_required', '尚未生成本地页面。');
  let target = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (target !== root && !target.startsWith(root + path.sep)) return fail(res, 404, 'not_found', '未找到资源。');
  if (!path.extname(target)) target = path.join(root, 'index.html');
  const realTarget = await realpath(target).catch(() => null);
  if (!realTarget || !realTarget.startsWith(root + path.sep)) return fail(res, 404, 'not_found', '未找到资源。');
  const info = await stat(realTarget);
  if (!info.isFile()) return fail(res, 404, 'not_found', '未找到资源。');
  const type = MIME[path.extname(realTarget)] || 'application/octet-stream';
  send(res, 200, req.method === 'HEAD' ? '' : await readFile(realTarget), type);
}

// Dependency injection is deliberately server-only. Browser callers cannot choose an endpoint,
// key, model, voice, prompt, timeout, or fetch implementation.
export function createRequestHandler({
  env = process.env, fetchImpl = globalThis.fetch,
  staticRoot = path.join(ROOT, 'dist/client'), now = Date.now, upstreamTimeoutMs = 15_000,
} = {}) {
  const config = readConfig(env);
  let attempts = [];
  let inFlight = false;
  return async (req, res) => {
    try {
      if (!validLocalRequest(req, config, req.method === 'POST')) {
        return fail(res, 403, 'local_only', '仅允许同源本机访问。');
      }
      if (!req.url?.startsWith('/') || req.url.startsWith('//')) return fail(res, 400, 'invalid_path', '地址无效。');
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (url.pathname === '/api/voice/status') {
        if (req.method !== 'GET') return fail(res, 405, 'method_not_allowed', '不支持该请求方法。', { Allow: 'GET' });
        return send(res, 200, JSON.stringify(publicStatus(config)));
      }
      if (url.pathname === '/api/voice/session') {
        if (req.method !== 'POST') return fail(res, 405, 'method_not_allowed', '不支持该请求方法。', { Allow: 'POST' });
        if (!publicStatus(config).ready) return fail(res, 503, 'voice_unavailable', '语音未启用或成人测试配置尚未完成。');
        const body = await readJson(req);
        const lesson = validateBody(body);
        const time = now();
        attempts = attempts.filter(timestamp => timestamp > time - 60_000);
        if (inFlight || attempts.length >= 3) {
          return fail(res, 429, 'rate_limited', '连接过于频繁，请一分钟后再试。', { 'Retry-After': '60' });
        }
        attempts.push(time);
        inFlight = true;
        const controller = new AbortController();
        let timedOut = false;
        const timer = setTimeout(() => { timedOut = true; controller.abort(); }, upstreamTimeoutMs);
        const onClose = () => { if (!res.writableEnded) controller.abort(); };
        res.once('close', onClose);
        try {
          const form = new FormData();
          form.set('sdp', body.sdp);
          form.set('session', JSON.stringify(buildSession(lesson, config)));
          const upstream = await fetchImpl(UPSTREAM_URL, {
            method: 'POST', headers: { Authorization: `Bearer ${config.apiKey}` },
            body: form, signal: controller.signal, redirect: 'error',
          });
          if (!upstream.ok) {
            await upstream.body?.cancel().catch(() => {});
            return fail(res, 502, 'provider_rejected', '语音服务暂不可用，请成人检查账号权限、余额或模型设置。');
          }
          const answer = await readAnswer(upstream);
          return send(res, 201, answer, 'application/sdp');
        } catch {
          return fail(res, timedOut ? 504 : 502, timedOut ? 'provider_timeout' : 'provider_unavailable',
            timedOut ? '语音连接超时，请稍后重试。' : '语音连接未成功，请稍后重试。');
        } finally {
          clearTimeout(timer);
          res.removeListener('close', onClose);
          controller.abort();
          inFlight = false;
        }
      }
      if (url.pathname.startsWith('/api/')) return fail(res, 404, 'not_found', '未找到接口。');
      if (!['GET', 'HEAD'].includes(req.method)) return fail(res, 405, 'method_not_allowed', '不支持该请求方法。');
      return await serveStatic(req, res, url, staticRoot);
    } catch (error) {
      if (error instanceof RequestError) return fail(res, error.status, error.code, error.message);
      return fail(res, 500, 'internal_error', '本地服务暂不可用。');
    }
  };
}

export function startLocalServer(options = {}) {
  const env = options.env || process.env;
  const config = readConfig(env);
  if (!Number.isInteger(config.port) || config.port < 1024 || config.port > 65535) {
    throw new Error('LOCAL_PORT must be an integer between 1024 and 65535.');
  }
  const server = http.createServer({ maxHeaderSize: 8192 }, createRequestHandler({ ...options, env }));
  server.requestTimeout = 20_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  server.listen(config.port, config.containerMode ? '0.0.0.0' : '127.0.0.1');
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const server = startLocalServer();
    server.once('listening', () => {
      console.log(`本地成人测试页面：http://127.0.0.1:${server.address().port}`);
      console.log('真实儿童语音使用尚未开放；启动不会自动请求 OpenAI。');
      if (readConfig().containerMode) console.log('容器模式：宿主机端口必须仅发布到 127.0.0.1，不要加入不可信容器网络。');
    });
    server.once('error', () => { console.error('本地服务启动失败，请检查端口。'); process.exitCode = 1; });
  } catch {
    console.error('本地服务配置无效，请检查 LOCAL_PORT。');
    process.exitCode = 1;
  }
}
