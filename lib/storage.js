import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const STORAGE_LIMIT = 100;

const CONTACT_SUBMISSIONS_KEY = "portfolio:contact_submissions";
const CHAT_HISTORY_KEY = "portfolio:chat_history";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_STORAGE_PATH = path.join(__dirname, "..", "data", "admin-storage.json");

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
  return true;
}

export function isAdminAuthorized(token) {
  const expected = getAdminToken();
  return Boolean(expected && sanitize(token) === expected);
}

export async function saveContactSubmission(submission) {
  const record = {
    ...submission,
    kind: "contact_submission",
    createdAt: new Date().toISOString()
  };

  if (hasRedisConfig()) {
    const serialized = JSON.stringify(record);

    await redisCommand(["LPUSH", CONTACT_SUBMISSIONS_KEY, serialized]);
    await redisCommand(["LTRIM", CONTACT_SUBMISSIONS_KEY, "0", String(STORAGE_LIMIT - 1)]);
    return true;
  }

  await pushLocalRecord("submissions", record);
  return true;
}

export async function saveChatExchange(exchange) {
  const record = {
    ...exchange,
    kind: "chat_exchange",
    createdAt: new Date().toISOString()
  };

  if (hasRedisConfig()) {
    const serialized = JSON.stringify(record);

    await redisCommand(["LPUSH", CHAT_HISTORY_KEY, serialized]);
    await redisCommand(["LTRIM", CHAT_HISTORY_KEY, "0", String(STORAGE_LIMIT - 1)]);
    return true;
  }

  await pushLocalRecord("chatHistory", record);
  return true;
}

export async function getContactSubmissions() {
  if (hasRedisConfig()) {
    const result = await redisCommand(["LRANGE", CONTACT_SUBMISSIONS_KEY, "0", String(STORAGE_LIMIT - 1)]);
    return normalizeRecords(result);
  }

  const store = await readLocalStore();
  return Array.isArray(store.submissions) ? store.submissions : [];
}

export async function getChatHistory() {
  if (hasRedisConfig()) {
    const result = await redisCommand(["LRANGE", CHAT_HISTORY_KEY, "0", String(STORAGE_LIMIT - 1)]);
    return normalizeRecords(result);
  }

  const store = await readLocalStore();
  return Array.isArray(store.chatHistory) ? store.chatHistory : [];
}

async function ensureLocalStorageDir() {
  await fs.mkdir(path.dirname(LOCAL_STORAGE_PATH), { recursive: true });
}

async function readLocalStore() {
  try {
    const raw = await fs.readFile(LOCAL_STORAGE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return {
      submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [],
      chatHistory: Array.isArray(parsed.chatHistory) ? parsed.chatHistory : []
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return {
        submissions: [],
        chatHistory: []
      };
    }

    throw error;
  }
}

async function writeLocalStore(store) {
  await ensureLocalStorageDir();
  await fs.writeFile(LOCAL_STORAGE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function pushLocalRecord(key, record) {
  const store = await readLocalStore();
  const nextRecords = [record, ...(store[key] || [])].slice(0, STORAGE_LIMIT);
  store[key] = nextRecords;
  await writeLocalStore(store);
}
