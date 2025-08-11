const express = require("express");
const path = require("path");
const cors = require("cors");
const app = express();

// --- Middleware
app.use(cors());
app.use(express.json());
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// --- Static frontend (serves /public as site root)
app.use(express.static(path.join(process.cwd(), "public")));

// --- Health check (for deployment monitors)
app.get("/health", (_req, res) => res.json({ ok: true }));

// --- Simulated backend "database"
const faqData = [
  { tags: ["register","signup","enroll","join"],
    answer: "You can register here: <a href='https://stimulus.org.in/register' target='_blank'>stimulus.org.in/register</a>" },
  { tags: ["services","offer","help","support"],
    answer: "We offer Business Consulting, Recruitment, and Advisory. Learn more at our <a href='https://stimulus.org.in/services' target='_blank'>Services page</a>." },
  { tags: ["contact","email","reach"],
    answer: "Reach us at <strong>founder@stimulus.org.in</strong> or via the <a href='https://stimulus.org.in/contact' target='_blank'>Contact Page</a>." },
  { tags: ["about","company","what is"],
    answer: "Stimulus is a consulting firm founded in 2025, focused on helping businesses grow smarter. See our <a href='https://stimulus.org.in/about' target='_blank'>About page</a>." },
  { tags: ["home","homepage","start"],
    answer: "Explore our homepage at <a href='https://stimulus.org.in' target='_blank'>stimulus.org.in</a>" }
];

// --- API: intent lookup
app.post("/get-response", (req, res) => {
  const userInput = (req.body.message || "").toLowerCase();
  for (const entry of faqData) {
    if (entry.tags.some(tag => userInput.includes(tag))) {
      return res.json({ reply: entry.answer, followup: null });
    }
  }
  // default
  res.json({
    reply: "I can help you navigate: try asking about registration, services, or contact info.",
    followup: null
  });
});

// --- API: simple follow-up branching for "services"
app.post("/services-detail", (req, res) => {
  const msg = (req.body.message || "").toLowerCase();
  if (/(consult(ing)?)/.test(msg)) {
    return res.json({ reply:
      "Consulting: strategy, GTM, ops. Learn more: <a href='https://stimulus.org.in/services#consulting' target='_blank'>Consulting</a>"
    });
  }
  if (/recruit(ment|ing)|hire/.test(msg)) {
    return res.json({ reply:
      "Recruitment: sourcing to selection. See details: <a href='https://stimulus.org.in/services#recruitment' target='_blank'>Recruitment</a>"
    });
  }
  res.json({ reply: "Are you interested in Consulting or Recruitment?" });
});

// --- Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));