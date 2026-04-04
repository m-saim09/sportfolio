import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import dotenv from "dotenv";
import chatHandler from "./api/chat.js";
import contactHandler from "./api/contact.js";
import adminSubmissionsHandler from "./api/admin/submissions.js";
import adminChatHistoryHandler from "./api/admin/chat-history.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.post("/api/chat", chatHandler);
app.post("/api/contact", contactHandler);
app.get("/api/admin/submissions", adminSubmissionsHandler);
app.get("/api/admin/chat-history", adminChatHistoryHandler);
app.get("/dashboard", (_req, res) => {
  res.sendFile(path.join(__dirname, "dashboard.html"));
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, () => {
  console.log(`Portfolio server running on http://localhost:${port}`);
});
