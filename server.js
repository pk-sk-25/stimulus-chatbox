const express = require("express");
const path = require("path");
const cors = require("cors");
const app = express();

/* ------------------- Middleware ------------------- */
app.use(cors());
app.use(express.json());
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

/* ------------- Serve frontend from /public --------- */
app.use(express.static(path.join(process.cwd(), "public")));

/* ----------------- Health / Version ---------------- */
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/version", (_req, res) => res.json({ version: "phase-3-final-1.0.0" }));

/* -------------------- Helpers ---------------------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function summarizeUserMessage(msg) {
  const cleaned = (msg || "").trim().replace(/\s+/g, " ");
  return cleaned.length > 120 ? cleaned.slice(0, 117) + "..." : cleaned;
}

/* ---------------- Simulated “KB” ------------------- */
const KB = [
  {
    intent: "register",
    tags: ["register", "signup", "enroll", "join"],
    replies: [
      "You can register here: <a href='https://stimulus.org.in/register' target='_blank'>stimulus.org.in/register</a>.",
      "To get started, visit <a href='https://stimulus.org.in/register' target='_blank'>stimulus.org.in/register</a> and submit the form.",
      "Register anytime at <a href='https://stimulus.org.in/register' target='_blank'>stimulus.org.in/register</a> — we’ll reach out soon."
    ]
  },
  {
    intent: "services",
    tags: ["services", "offer", "help", "support", "what do you do", "solutions"],
    replies: [
      "We offer Business Consulting, Recruitment, and Advisory. Details: <a href='https://stimulus.org.in/services' target='_blank'>Services</a>.",
      "Our core services: Consulting, Recruitment, and Advisory — see <a href='https://stimulus.org.in/services' target='_blank'>services</a>.",
      "We help with strategy, hiring, and advisory. Explore: <a href='https://stimulus.org.in/services' target='_blank'>services page</a>."
    ],
    followupPrompt: "Are you interested in Consulting or Recruitment?"
  },
  {
    intent: "contact",
    tags: ["contact", "email", "reach", "support", "helpdesk"],
    replies: [
      "Reach us at <strong>founder@stimulus.org.in</strong> or via <a href='https://stimulus.org.in/contact' target='_blank'>Contact</a>.",
      "You can write to <strong>founder@stimulus.org.in</strong> or use the <a href='https://stimulus.org.in/contact' target='_blank'>contact form</a>.",
      "Contact options: email <strong>founder@stimulus.org.in</strong> or <a href='https://stimulus.org.in/contact' target='_blank'>Contact page</a>."
    ]
  },
  {
    intent: "about",
    tags: ["about", "company", "what is", "who are you"],
    replies: [
      "Stimulus is a consulting firm (founded 2025) helping businesses grow smarter. More: <a href='https://stimulus.org.in/about' target='_blank'>About</a>.",
      "We’re a consulting startup focused on growth, hiring, and advisory. Learn more: <a href='https://stimulus.org.in/about' target='_blank'>About</a>.",
      "We specialize in consulting and recruitment. See <a href='https://stimulus.org.in/about' target='_blank'>About us</a>."
    ]
  },
  {
    intent: "home",
    tags: ["home", "homepage", "start"],
    replies: [
      "Explore the homepage: <a href='https://stimulus.org.in' target='_blank'>stimulus.org.in</a>.",
      "Head to the homepage here: <a href='https://stimulus.org.in' target='_blank'>stimulus.org.in</a>.",
      "Homepage: <a href='https://stimulus.org.in' target='_blank'>stimulus.org.in</a>."
    ]
  }
];

function detectIntent(userInput) {
  const input = (userInput || "").toLowerCase();
  for (const entry of KB) {
    if (entry.tags.some((t) => input.includes(t))) return entry;
  }
  return null;
}

/* --------------- Main reply endpoint --------------- */
app.post("/get-response", async (req, res) => {
  const userText = req.body.message || "";

  // Simulated thinking delay (900–1800ms)
  await sleep(900 + Math.min(900, userText.length * 8));

  // Handle direct detail intents even without a prior "services" turn
  if (/(consult(ing)?)/i.test(userText)) {
    return res.json({
      reply:
        "Consulting covers strategy, GTM, and operations. Details: " +
        "<a href='https://stimulus.org.in/services#consulting' target='_blank'>Consulting</a>",
      followup: null,
      intent: "services_consulting"
    });
  }
  if (/recruit(ment|ing)|hire/i.test(userText)) {
    return res.json({
      reply:
        "Recruitment spans sourcing to selection. See: " +
        "<a href='https://stimulus.org.in/services#recruitment' target='_blank'>Recruitment</a>",
      followup: null,
      intent: "services_recruitment"
    });
  }

  // Normal KB lookup
  const entry = detectIntent(userText);
  if (entry) {
    const reply = pick(entry.replies).replace("{user}", summarizeUserMessage(userText));
    return res.json({
      reply,
      followup: entry.followupPrompt || null,
      intent: entry.intent
    });
  }

  // Fallback
  const echoed = summarizeUserMessage(userText);
  return res.json({
    reply:
      `I can help you navigate the site. You said: “${echoed}”. ` +
      `Try asking about registration, services, or contact info.`,
    followup: null,
    intent: "fallback"
  });
});

/* --------- Services follow-up branching API -------- */
app.post("/services-detail", async (req, res) => {
  const msg = (req.body.message || "").toLowerCase();
  await sleep(800 + Math.floor(Math.random() * 600));

  if (/(consult(ing)?)/.test(msg)) {
    return res.json({
      reply:
        "Consulting: strategy, GTM, operations. Learn more: " +
        "<a href='https://stimulus.org.in/services#consulting' target='_blank'>Consulting</a>",
      followup: null,
      intent: "services_consulting"
    });
  }
  if (/recruit(ment|ing)|hire/.test(msg)) {
    return res.json({
      reply:
        "Recruitment: sourcing to selection. See details: " +
        "<a href='https://stimulus.org.in/services#recruitment' target='_blank'>Recruitment</a>",
      followup: null,
      intent: "services_recruitment"
    });
  }
  return res.json({
    reply: "Are you interested in Consulting or Recruitment?",
    followup: "Consulting or Recruitment?",
    intent: "services_followup"
  });
});

app.get("/suggest", (_req, res) => {
  res.json({ suggestions: ["Register", "Services", "Contact", "About", "Home"] });
});

/* ---------------------- Start ---------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));