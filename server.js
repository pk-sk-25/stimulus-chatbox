const express = require("express");
const path = require("path");
const cors = require("cors");
const app = express();

/* ---------------- Config: edit these URLs if needed ---------------- */
const LINKS = {
  home:        "https://stimulus.org.in/",
  services:    "https://stimulus.org.in/services",
  consulting:  "https://stimulus.org.in/services#consulting",   // <- change if your site uses a different anchor/path
  recruitment: "https://stimulus.org.in/services#recruitment",  // <- (e.g., '/services/recruitment' or '?tab=recruitment')
  register:    "https://stimulus.org.in/register",
  contact:     "https://stimulus.org.in/contact",
  about:       "https://stimulus.org.in/about",
  email:       "founder@stimulus.org.in",
};

/* ---------------- Middleware / static ---------------- */
app.use(cors());
app.use(express.json());
app.use((req, _res, next) => { console.log(`${new Date().toISOString()} ${req.method} ${req.url}`); next(); });
app.use(express.static(path.join(process.cwd(), "public")));
app.get("/health", (_req,res)=>res.json({ok:true}));
app.get("/version", (_req,res)=>res.json({version:"phase-3-final-1.1.0"}));

/* ---------------- Helpers ---------------- */
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
const pick = (arr)=>arr[Math.floor(Math.random()*arr.length)];
const clean = (s="")=>s.toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();
const tokenize = (s)=>clean(s).split(" ").filter(Boolean);
const scoreIntent = (tokens, intent) => {
  let score = 0;
  for (const kw of intent.keywords) if (tokens.includes(kw)) score += 2;        // exact
  for (const syn of intent.synonyms || []) if (tokens.includes(syn)) score += 1; // loose
  return score;
};
function summarizeUserMessage(msg) {
  const t=(msg||"").trim().replace(/\s+/g," ");
  return t.length>120 ? t.slice(0,117)+"..." : t;
}

/* ---------------- Intents (NLU-lite KB) ---------------- */
const INTENTS = [
  {
    id: "register",
    keywords: ["register","signup","enroll","join"],
    synonyms: ["sign","sign-up","apply"],
    replies: [
      `You can register here: <a href="${LINKS.register}" target="_blank">${LINKS.register}</a>.`,
      `To get started, visit <a href="${LINKS.register}" target="_blank">the registration page</a> and submit the form.`
    ]
  },
  {
    id: "services",
    keywords: ["services","offer","offers","solutions","support","help"],
    synonyms: ["service","do","provide","provide"],
    replies: [
      `We offer Business Consulting, Recruitment, and Advisory. Details: <a href="${LINKS.services}" target="_blank">Services</a>.`,
      `Our core services: Consulting, Recruitment, and Advisory — see <a href="${LINKS.services}" target="_blank">Services</a>.`
    ],
    followup: "Are you interested in Consulting or Recruitment?"
  },
  {
    id: "consulting",
    keywords: ["consulting","consult"],
    synonyms: ["strategy","gtm","operations"],
    replies: [
      `Consulting covers strategy, GTM, and operations. Learn more: <a href="${LINKS.consulting}" target="_blank">Consulting</a>.`
    ]
  },
  {
    id: "recruitment",
    keywords: ["recruitment","recruiting","hire","hiring","talent"],
    replies: [
      `Recruitment spans sourcing to selection. See details: <a href="${LINKS.recruitment}" target="_blank">Recruitment</a>.`
    ]
  },
  {
    id: "contact",
    keywords: ["contact","email","reach","support","helpdesk"],
    replies: [
      `Reach us at <strong>${LINKS.email}</strong> or via <a href="${LINKS.contact}" target="_blank">Contact</a>.`
    ]
  },
  {
    id: "about",
    keywords: ["about","company","who","what"],
    replies: [
      `Stimulus is a consulting firm (founded 2025) helping businesses grow smarter. More: <a href="${LINKS.about}" target="_blank">About</a>.`
    ]
  },
  {
    id: "home",
    keywords: ["home","homepage","start"],
    replies: [
      `Explore the homepage: <a href="${LINKS.home}" target="_blank">${LINKS.home}</a>.`
    ]
  }
];

/* ---------------- Routing logic ---------------- */
async function handleMessage(userText) {
  // Simulated thinking delay (900–1800ms)
  await sleep(900 + Math.min(900, userText.length * 8));

  const tokens = tokenize(userText);

  // direct-detail shortcuts (works even without prior "services")
  if (/(consult(ing)?)/i.test(userText)) {
    return { reply: INTENTS.find(i=>i.id==="consulting").replies[0], intent:"consulting" };
  }
  if (/recruit(ment|ing)|hire/i.test(userText)) {
    return { reply: INTENTS.find(i=>i.id==="recruitment").replies[0], intent:"recruitment" };
  }

  // score all intents
  let best = null, bestScore = 0, second = null, secondScore = 0;
  for (const intent of INTENTS) {
    const s = scoreIntent(tokens, intent);
    if (s > bestScore) { second = best; secondScore = bestScore; best = intent; bestScore = s; }
    else if (s > secondScore) { second = intent; secondScore = s; }
  }

  if (best && bestScore >= 2) {
    const reply = pick(best.replies);
    const followup = best.followup || null;

    // If top two are close (tie-ish), clarify
    if (second && Math.abs(bestScore - secondScore) <= 1 && best.id === "services") {
      return {
        reply: `${reply} ${best.followup || "Are you interested in Consulting or Recruitment?"}`,
        intent: "services",
        followup: best.followup || "Consulting or Recruitment?"
      };
    }

    return { reply, intent: best.id, followup };
  }

  // Fallback
  const echoed = summarizeUserMessage(userText);
  return {
    reply: `I can help you navigate the site. You said: “${echoed}”. Try asking about registration, services, or contact info.`,
    intent: "fallback",
    followup: null
  };
}

/* ---------------- API ---------------- */
app.post("/get-response", async (req, res) => {
  const userText = req.body.message || "";
  const result = await handleMessage(userText);
  res.json(result);
});

app.post("/services-detail", async (req, res) => {
  const msg = (req.body.message || "").toLowerCase();
  await sleep(800 + Math.floor(Math.random() * 600));

  if (/(consult(ing)?)/.test(msg)) {
    return res.json({
      reply: INTENTS.find(i=>i.id==="consulting").replies[0],
      followup: null,
      intent: "consulting"
    });
  }
  if (/recruit(ment|ing)|hire/.test(msg)) {
    return res.json({
      reply: INTENTS.find(i=>i.id==="recruitment").replies[0],
      followup: null,
      intent: "recruitment"
    });
  }
  return res.json({
    reply: "Are you interested in Consulting or Recruitment?",
    followup: "Consulting or Recruitment?",
    intent: "services_followup"
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));