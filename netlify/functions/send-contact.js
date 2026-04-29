"use strict";

const nodemailer = require("nodemailer");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isValidEmail(email) {
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(email);
}

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_FROM, pass: process.env.EMAIL_PASSWORD },
    });
  }
  return transporter;
}

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { ...CORS_HEADERS, Allow: "POST" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Parse body
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  const { name, email, surname, phone, position, interests, comment } = body;

  // Basic validation
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Name is required" }),
    };
  }
  if (name.trim().length > 100) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Name is too long" }),
    };
  }

  if (!email || typeof email !== "string" || !isValidEmail(email.trim())) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "A valid email address is required" }),
    };
  }
  if (email.trim().length > 254) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Email address is too long" }),
    };
  }

  if (comment && typeof comment === "string" && comment.length > 5000) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Comment is too long (max 5000 characters)" }),
    };
  }

  // Check required env vars
  const { EMAIL_FROM, EMAIL_TO, EMAIL_PASSWORD } = process.env;
  if (!EMAIL_FROM || !EMAIL_TO || !EMAIL_PASSWORD) {
    console.error("Missing required environment variables: EMAIL_FROM, EMAIL_TO, and/or EMAIL_PASSWORD");
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Server configuration error. Please contact the site administrator." }),
    };
  }

  // Build email content
  const safeName = name.trim();
  const safeEmail = email.trim();
  const safeSurname = surname ? String(surname).trim().slice(0, 100) : "";
  const safePhone = phone ? String(phone).trim().slice(0, 50) : "";
  const safePosition = position ? String(position).trim().slice(0, 200) : "";
  const safeInterests = Array.isArray(interests)
    ? interests.map((i) => String(i).trim().slice(0, 200)).filter(Boolean)
    : [];
  const safeComment = comment ? String(comment).trim().slice(0, 5000) : "";

  const subject = `New contact form submission from ${safeName}`;

  const textBody = [
    `Name: ${safeName}${safeSurname ? " " + safeSurname : ""}`,
    `Email: ${safeEmail}`,
    safePhone ? `Phone: ${safePhone}` : null,
    safePosition ? `Position: ${safePosition}` : null,
    safeInterests.length ? `Interests: ${safeInterests.join(", ")}` : null,
    safeComment ? `\nComment:\n${safeComment}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const htmlBody = `
<h2>New Contact Form Submission</h2>
<table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse;font-family:sans-serif;">
  <tr><th align="left">Name</th><td>${escapeHtml(safeName)}${safeSurname ? " " + escapeHtml(safeSurname) : ""}</td></tr>
  <tr><th align="left">Email</th><td>${escapeHtml(safeEmail)}</td></tr>
  ${safePhone ? `<tr><th align="left">Phone</th><td>${escapeHtml(safePhone)}</td></tr>` : ""}
  ${safePosition ? `<tr><th align="left">Position</th><td>${escapeHtml(safePosition)}</td></tr>` : ""}
  ${safeInterests.length ? `<tr><th align="left">Interests</th><td>${safeInterests.map(escapeHtml).join("<br>")}</td></tr>` : ""}
  ${safeComment ? `<tr><th align="left">Comment</th><td>${escapeHtml(safeComment).replace(/\n/g, "<br>")}</td></tr>` : ""}
</table>
`.trim();

  // Send email
  const transport = getTransporter();

  try {
    await transport.sendMail({
      from: EMAIL_FROM,
      to: EMAIL_TO,
      replyTo: safeEmail,
      subject,
      text: textBody,
      html: htmlBody,
    });
  } catch (err) {
    console.error("Failed to send contact form email:", err.message || err.code || "Unknown error");
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Failed to send email. Please try again later." }),
    };
  }

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: true }),
  };
};
