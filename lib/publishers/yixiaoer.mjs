// 蚁小二 provider adapter.
// 只做协议封装；真实发布前必须 schema/validate/dry-run。
// 凭证只从服务端环境读取，绝不进入前端。

const BASE = () => String(process.env.YIXIAOER_BASE_URL || 'https://open-api.yixiaoer.cn').replace(/\/+$/, '');
const AUTH = () => String(process.env.YIXIAOER_AUTHORIZATION || process.env.YIXIAOER_API_KEY || '');

export function yixiaoerConfigured() {
  return Boolean(AUTH());
}

async function request(path, { method = 'GET', body } = {}) {
  const token = AUTH();
  if (!token) throw new Error('未配置 YIXIAOER_AUTHORIZATION / YIXIAOER_API_KEY');
  const res = await fetch(BASE() + path, {
    method,
    headers: { authorization: token, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data.statusCode && data.statusCode >= 400)) {
    throw new Error(data.message || `蚁小二 API ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return data;
}

export async function listAccounts(platform = '') {
  const q = new URLSearchParams({ page: '1', size: '100' });
  if (platform) q.set('platform', platform);
  return request(`/v2/platform/accounts?${q}`);
}

export async function createTask(payload) {
  return request('/taskSets/v2', { method: 'POST', body: payload });
}

export async function getTask(taskSetId) {
  return request(`/taskSets/v2/${encodeURIComponent(taskSetId)}`);
}

export function buildTaskPayload({ platform, publishType, accountId, form, contentId, templateVersion }) {
  return {
    platforms: [platform],
    publishType,
    publishChannel: process.env.YIXIAOER_PUBLISH_CHANNEL || 'cloud',
    platformAccountId: accountId,
    contentId,
    templateVersion,
    publishArgs: {
      accountForms: [{ platformAccountId: accountId, contentPublishForm: form }]
    }
  };
}
