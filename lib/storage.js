const STORAGE_LIMIT = 100;

const CONTACT_SUBMISSIONS_KEY = "portfolio:contact_submissions";
const CHAT_HISTORY_KEY = "portfolio:chat_history";

const hasRedisConfig = () => Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const getAdminToken = () => sanitize(process.env.ADMIN_DASHBOARD_TOKEN);

function sanitize(value = "") {
  return String(value).trim();
}

async function redisCommand(command) {
  if (!hasRedisConfig()) {
    return null;
  }

  const response = await fetch(process.env.UPSTASH_REDIS_REST_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Upstash request failed: ${response.status} ${details}`);
  }

  const payload = await response.json();
  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload.result ?? null;
}

function normalizeRecords(result) {
  if (!Array.isArray(result)) {
    return [];
  }

  return result.map((entry) => {
    if (typeof entry !== "string") {
      return entry;
    }

    try {
      return JSON.parse(entry);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

export function isStorageConfigured() {
  return hasRedisConfig();
}

export function isAdminAuthorized(token) {
  const expected = getAdminToken();
  return Boolean(expected && sanitize(token) === expected);
}

export async function saveContactSubmission(submission) {
  if (!hasRedisConfig()) {
    return false;
  }

  const serialized = JSON.stringify({
    ...submission,
    kind: "contact_submission",
    createdAt: new Date().toISOString()
  });

  await redisCommand(["LPUSH", CONTACT_SUBMISSIONS_KEY, serialized]);
  await redisCommand(["LTRIM", CONTACT_SUBMISSIONS_KEY, "0", String(STORAGE_LIMIT - 1)]);
  return true;
}

export async function saveChatExchange(exchange) {
  if (!hasRedisConfig()) {
    return false;
  }

  const serialized = JSON.stringify({
    ...exchange,
    kind: "chat_exchange",
    createdAt: new Date().toISOString()
  });

  await redisCommand(["LPUSH", CHAT_HISTORY_KEY, serialized]);
  await redisCommand(["LTRIM", CHAT_HISTORY_KEY, "0", String(STORAGE_LIMIT - 1)]);
  return true;
}

export async function getContactSubmissions() {
  if (!hasRedisConfig()) {
    return [];
  }

  const result = await redisCommand(["LRANGE", CONTACT_SUBMISSIONS_KEY, "0", String(STORAGE_LIMIT - 1)]);
  return normalizeRecords(result);
}

export async function getChatHistory() {
  if (!hasRedisConfig()) {
    return [];
  }

  const result = await redisCommand(["LRANGE", CHAT_HISTORY_KEY, "0", String(STORAGE_LIMIT - 1)]);
  return normalizeRecords(result);
}
