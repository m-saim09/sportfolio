import { getContactSubmissions, isAdminAuthorized, isStorageConfigured } from "../../lib/storage.js";

const getToken = (req) => {
  const authHeader = req.headers?.authorization || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  return bearerToken || req.query?.token || req.headers?.["x-admin-token"] || "";
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!isAdminAuthorized(getToken(req))) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  if (!isStorageConfigured()) {
    return res.status(503).json({ error: "Storage is not configured." });
  }

  try {
    const submissions = await getContactSubmissions();
    return res.status(200).json({ submissions });
  } catch (error) {
    console.error("Admin submissions fetch failed:", error);
    return res.status(500).json({ error: "Unable to load submissions right now." });
  }
}
