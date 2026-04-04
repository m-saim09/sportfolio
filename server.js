import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const transporter = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false") === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  : null;

const sanitize = (value = "") => String(value).trim();
const whatsappUrl = "https://wa.me/92319667125";

const getMockResponse = (question) => {
  const q = question.toLowerCase();

  if (
    q.includes("free") ||
    q.includes("available") ||
    q.includes("availability") ||
    q.includes("are you available") ||
    q.includes("are you free") ||
    q.includes("can you work")
  ) {
    return `Yes, Muhammad Saim is available for freelance and project-based work. If you want to discuss a project, please use the contact form on this portfolio or message directly on WhatsApp: ${whatsappUrl}`;
  }

  if (q.includes("skill") || q.includes("tech")) {
    return "Muhammad Saim works mainly with the MERN stack: React, Node.js, Express, MongoDB, JavaScript, Tailwind CSS, and modern responsive UI work.";
  }

  if (q.includes("project")) {
    return "Featured work includes FastBite, Job Finder Hub, Skill Share LMS, Property Finder, Social Web App, and Project Tracker. You can explore them in the Projects section.";
  }

  if (q.includes("contact") || q.includes("hire") || q.includes("email")) {
    return `For work or hiring, please fill out the contact form on this portfolio. You can also reach out directly on WhatsApp here: ${whatsappUrl}`;
  }

  if (q.includes("service")) {
    return "Services include Full Stack Development, Frontend Development, and API Development, with a focus on clean UI and production-minded implementation.";
  }

  return `I can help with questions about Muhammad Saim's skills, projects, services, availability, and contact options. If you want to work together, please fill out the contact form or message on WhatsApp: ${whatsappUrl}`;
};

app.post("/api/chat", async (req, res) => {
  const question = sanitize(req.body.question);

  if (!question) {
    return res.status(400).json({ error: "Question is required." });
  }

  if (!openai) {
    return res.json({ answer: getMockResponse(question) });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content: "You are a concise and helpful portfolio assistant for Muhammad Saim, a MERN Stack Developer. Answer only about his portfolio, skills, services, projects, availability, and contact options. If someone asks whether he is free, available, or open for work, say yes, he is available for freelance and project-based work. Then guide them to fill out the contact form and also mention direct WhatsApp contact at https://wa.me/92319667125. Keep answers short, natural, and useful."
        },
        {
          role: "user",
          content: question
        }
      ]
    });

    const answer = completion.choices?.[0]?.message?.content?.trim() || getMockResponse(question);
    return res.json({ answer });
  } catch (error) {
    console.error("Chat request failed:", error);
    return res.json({ answer: getMockResponse(question) });
  }
});

app.post("/api/contact", async (req, res) => {
  const name = sanitize(req.body.name);
  const email = sanitize(req.body.email);
  const subject = sanitize(req.body.subject);
  const message = sanitize(req.body.message);

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: "All contact form fields are required." });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return res.status(400).json({ error: "A valid email address is required." });
  }

  if (!transporter) {
    return res.status(500).json({
      error: "Email service is not configured yet. Please set SMTP credentials in the environment."
    });
  }

  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to: process.env.CONTACT_TO || "msaimryk1@gmail.com",
      replyTo: email,
      subject: `Portfolio Contact: ${subject}`,
      text: `New portfolio contact form submission

Name: ${name}
Email: ${email}
Project Type: ${subject}

Message:
${message}
`,
      html: `
        <h2>New Portfolio Contact Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Project Type:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
      `
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Contact request failed:", error);
    return res.status(500).json({ error: "Unable to send email right now." });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, () => {
  console.log(`Portfolio server running on http://localhost:${port}`);
});
