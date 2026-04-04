import nodemailer from "nodemailer";

const sanitize = (value = "") => String(value).trim();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const name = sanitize(req.body?.name);
  const email = sanitize(req.body?.email);
  const subject = sanitize(req.body?.subject);
  const message = sanitize(req.body?.message);

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: "All contact form fields are required." });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return res.status(400).json({ error: "A valid email address is required." });
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(500).json({
      error: "Email service is not configured yet. Please add SMTP credentials in Vercel environment variables."
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false") === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

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

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Contact API error:", error);
    return res.status(500).json({ error: "Unable to send email right now." });
  }
}
