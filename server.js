const express = require("express");
const path = require("path");
const cors = require("cors");
const app = express();

/* ---------------- edit links here based on any site changes ---------------- */
const LINKS = {
  home:        "https://stimulus.org.in/",
  services:    "https://stimulus.org.in/services",
  consulting:  "https://stimulus.org.in/services#consulting",
  recruitment: "https://stimulus.org.in/services#recruitment",
  advisory:    "https://stimulus.org.in/services#advisory", // keep the same pattern if you add this section
  register:    "https://stimulus.org.in/register",
  contact:     "https://stimulus.org.in/contact",
  about:       "https://stimulus.org.in/about",
  email:       "founder@stimulus.org.in",
};

/* ---------------- middleware / static ---------------- */
app.use(cors());
app.use(express.json());
app.use((req, _res, next) => { console.log(`${new Date().toISOString()} ${req.method} ${req.url}`); next(); });
app.use(express.static(path.join(process.cwd(), "public")));
app.get("/health", (_req,res)=>res.json({ok:true}));
app.get("/version", (_req,res)=>res.json({version:"phase-3-detailed-1.0.0"}));

/* ---------------- helpers ---------------- */
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
const pick = (arr)=>arr[Math.floor(Math.random()*arr.length)];
const clean = (s="")=>s.toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();
const tokenize = (s)=>clean(s).split(" ").filter(Boolean);
const scoreIntent = (tokens, intent) => {
  let score = 0;
  for (const kw of intent.keywords) if (tokens.includes(kw)) score += 2;
  for (const syn of intent.synonyms || []) if (tokens.includes(syn)) score += 1;
  return score;
};
function summarizeUserMessage(msg) {
  const t=(msg||"").trim().replace(/\s+/g," ");
  return t.length>140 ? t.slice(0,137)+"..." : t;
}

/* ---------------- intents ---------------- */
const INTENTS = [
  {
    id: "register",
    keywords: ["register","signup","sign","enroll","join","get started","start"],
    synonyms: ["apply","application","registration"],
    replies: [
      `
      <div><strong>How to register</strong></div>
      <ul>
        <li>Go to <a href="${LINKS.register}" target="_blank">${LINKS.register}</a></li>
        <li>Fill your details and business needs</li>
        <li>We’ll confirm by email within 1–2 business days</li>
      </ul>
      <div>Need help? Write to <strong>${LINKS.email}</strong> or use the <a href="${LINKS.contact}" target="_blank">contact form</a>.</div>
      `
    ]
  },
  {
    id: "services",
    keywords: ["services","service","offer","offers","solutions","support","help","capabilities"],
    synonyms: ["what do you do","what you do","portfolio"],
    replies: [
      `
      <div><strong>Our services at a glance</strong></div>
      <ul>
        <li><a href="${LINKS.consulting}" target="_blank">Consulting</a>: growth strategy, GTM, ops improvement</li>
        <li><a href="${LINKS.recruitment}" target="_blank">Recruitment</a>: sourcing → screening → selection</li>
        <li><a href="${LINKS.advisory}" target="_blank">Advisory</a>: leadership hiring, process audits, org design</li>
      </ul>
      <div>Full details: <a href="${LINKS.services}" target="_blank">${LINKS.services}</a></div>
      `,
      `
      <div><strong>We typically help with</strong></div>
      <ul>
        <li>Defining your growth plan and GTM</li>
        <li>Hiring hard‑to‑find talent faster</li>
        <li>Advising founders on process & org scale‑up</li>
      </ul>
      <div>Explore: <a href="${LINKS.services}" target="_blank">Services</a></div>
      `
    ],
    followup: "Are you interested in Consulting or Recruitment?"
  },
  {
    id: "consulting",
    keywords: ["consulting","consult","strategy","gtm","operations","process","scale","optimize"],
    synonyms: ["improvement","efficiency","roadmap","plan"],
    replies: [
      `
      <div><strong>Consulting</strong></div>
      <ul>
        <li><em>Growth & GTM</em>: market sizing, positioning, channel strategy</li>
        <li><em>Operations</em>: process mapping, KPI design, cost reduction</li>
        <li><em>Founder advisory</em>: OKRs, hiring plans, org architecture</li>
      </ul>
      <div>Details: <a href="${LINKS.consulting}" target="_blank">${LINKS.consulting}</a></div>
      `
    ]
  },
  {
    id: "recruitment",
    keywords: ["recruitment","recruiting","hire","hiring","talent","candidates","staffing"],
    synonyms: ["sourcing","screening","selection","interview"],
    replies: [
      `
      <div><strong>Recruitment</strong></div>
      <ul>
        <li><em>Sourcing</em>: curated pipelines from multiple channels</li>
        <li><em>Screening</em>: skills & culture‑fit evaluation</li>
        <li><em>Selection</em>: interviews, offers, onboarding support</li>
      </ul>
      <div>See: <a href="${LINKS.recruitment}" target="_blank">${LINKS.recruitment}</a></div>
      `
    ]
  },
  {
    id: "advisory",
    keywords: ["advisory","advise","advisor","audit","org","organization","leadership"],
    synonyms: ["board","mentorship","coaching","assessment"],
    replies: [
      `
      <div><strong>Advisory</strong></div>
      <ul>
        <li>Leadership hiring support & interview panels</li>
        <li>Process/people audits with actionable scorecards</li>
        <li>Org design & change management coaching</li>
      </ul>
      <div>Learn more: <a href="${LINKS.advisory}" target="_blank">${LINKS.advisory}</a></div>
      `
    ]
  },
  {
    id: "contact",
    keywords: ["contact","email","reach","support","helpdesk","phone","call"],
    replies: [
      `
      <div><strong>Contact Stimulus</strong></div>
      <ul>
        <li>Email: <strong>${LINKS.email}</strong></li>
        <li>Form: <a href="${LINKS.contact}" target="_blank">${LINKS.contact}</a></li>
      </ul>
      <div>We usually respond within 1–2 business days.</div>
      `
    ]
  },
  {
    id: "about",
    keywords: ["about","company","who","what","background","story"],
    replies: [
      `
      <div><strong>About Stimulus</strong></div>
      <p>We’re a consulting startup (founded 2025) helping businesses grow and hire smarter.</p>
      <ul>
        <li>Consulting: strategy, GTM, operations</li>
        <li>Recruitment: end‑to‑end hiring</li>
        <li>Advisory: leadership & process audits</li>
      </ul>
      <div>More: <a href="${LINKS.about}" target="_blank">${LINKS.about}</a></div>
      `
    ]
  },
  {
    id: "home",
    keywords: ["home","homepage","start","website"],
    replies: [
      `
      <div><strong>Homepage</strong></div>
      <div>Jump in here: <a href="${LINKS.home}" target="_blank">${LINKS.home}</a></div>
      `
    ]
  }
];

/* ---------------- nlu-lite matching ---------------- */
async function handleMessage(userText) {
  // Simulated thinking delay (900–1800ms)
  await sleep(900 + Math.min(900, userText.length * 8));

  // Direct shortcuts first (works even without prior "services")
  if (/(consult(ing)?)/i.test(userText)) {
    return { reply: INTENTS.find(i=>i.id==="consulting").replies[0], intent:"consulting" };
  }
  if (/recruit(ment|ing)|hire/i.test(userText)) {
    return { reply: INTENTS.find(i=>i.id==="recruitment").replies[0], intent:"recruitment" };
  }

  // Score all intents
  const tokens = tokenize(userText);
  let best = null, bestScore = 0, second = null, secondScore = 0;
  for (const intent of INTENTS) {
    const s = scoreIntent(tokens, intent);
    if (s > bestScore) { second = best; secondScore = bestScore; best = intent; bestScore = s; }
    else if (s > secondScore) { second = intent; secondScore = s; }
  }

  if (best && bestScore >= 2) {
    const reply = pick(best.replies);
    const followup = best.followup || null;

    // Clarify if the top two are close and "services" is involved
    if (second && Math.abs(bestScore - secondScore) <= 1 && best.id === "services") {
      return {
        reply: `${reply} ${best.followup || "Are you interested in Consulting or Recruitment?"}`,
        intent: "services",
        followup: best.followup || "Consulting or Recruitment?"
      };
    }

    return { reply, intent: best.id, followup };
  }

  // Fallback with a little echo for context
  const echoed = summarizeUserMessage(userText);
  return {
    reply: `
      <div><strong>I can help you navigate the site.</strong></div>
      <div>You said: “${echoed}”. Try one of these quick options:</div>
      <ul>
        <li><a href="${LINKS.services}" target="_blank">See services</a></li>
        <li><a href="${LINKS.register}" target="_blank">Register</a></li>
        <li><a href="${LINKS.contact}" target="_blank">Contact us</a></li>
      </ul>
    `,
    intent: "fallback",
    followup: null
  };
}

/* ---------------- api (for config) ---------------- */
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

/* ---------------- start ---------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));