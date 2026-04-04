import OpenAI from "openai";
import { saveChatExchange } from "../lib/storage.js";

const sanitize = (value = "") => String(value).trim();

const getMockResponse = (question) => {
  const q = question.toLowerCase();

  if (q.includes("skill") || q.includes("tech")) {
    return "Muhammad Saim works mainly with the MERN stack: React, Node.js, Express, MongoDB, JavaScript, Tailwind CSS, and modern responsive UI work.";
  }

  if (q.includes("project")) {
    return "Featured work includes FastBite, Job Finder Hub, Skill Share LMS, Property Finder, Social Web App, and Project Tracker. You can explore them in the Projects section.";
  }

  if (q.includes("contact") || q.includes("hire") || q.includes("email")) {
    return "You can reach Muhammad Saim through the contact form, WhatsApp, or LinkedIn. The contact form sends a direct notification email to msaimryk1@gmail.com.";
  }

  if (q.includes("service")) {
    return "Services include Full Stack Development, Frontend Development, and API Development, with a focus on clean UI and production-minded implementation.";
  }

  return "I can help with questions about Muhammad Saim's skills, projects, services, availability, and how to get in touch.";
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const question = sanitize(req.body?.question);
  const sessionId = sanitize(req.body?.sessionId);
  if (!question) {
    return res.status(400).json({ error: "Question is required." });
  }

  if (!process.env.OPENAI_API_KEY) {
    const answer = getMockResponse(question);

    try {
      await saveChatExchange({ sessionId, question, answer });
    } catch (storageError) {
      console.error("Chat storage failed:", storageError);
    }

    return res.status(200).json({ answer });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content: "You are a concise portfolio assistant for Muhammad Saim, a MERN Stack Developer. Answer only about his portfolio, skills, services, projects, availability, and contact options."
        },
        { role: "user", content: question }
      ]
    });

    const answer = completion.choices?.[0]?.message?.content?.trim() || getMockResponse(question);

    try {
      await saveChatExchange({ sessionId, question, answer });
    } catch (storageError) {
      console.error("Chat storage failed:", storageError);
    }

    return res.status(200).json({ answer });
  } catch (error) {
    console.error("Chat API error:", error);
    const answer = getMockResponse(question);

    try {
      await saveChatExchange({ sessionId, question, answer });
    } catch (storageError) {
      console.error("Chat storage failed:", storageError);
    }

    return res.status(200).json({ answer });
  }
}
