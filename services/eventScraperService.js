import crypto from "crypto";
import puppeteer from "puppeteer";
import AddEventModel from "../model/AddEventModel.js";
import { areCloseEvents, canonicalRecordKey, uniqueByCloseness } from "./scraperDedupe.js";
import { enrichEventLogos } from "./scraperLogoService.js";

const DEFAULT_LIMIT = 140;
const DEFAULT_PER_SOURCE_LIMIT = 35;
const REQUEST_TIMEOUT = 28000;
const DAY_MS = 24 * 60 * 60 * 1000;

const TECH_EVENT_TERMS = [
  "ai",
  "api",
  "cloud",
  "code",
  "conference",
  "cyber",
  "data",
  "developer",
  "devops",
  "engineering",
  "frontend",
  "hackathon",
  "javascript",
  "kubernetes",
  "machine learning",
  "meetup",
  "open source",
  "opensource",
  "programming",
  "python",
  "security",
  "software",
  "startup",
  "tech",
  "typescript",
  "ux",
  "web",
  "workshop",
];

const EVENT_OWNER = {
  id: process.env.EVENT_SCRAPER_OWNER_ID || "external-tech-events",
  name: process.env.EVENT_SCRAPER_OWNER_NAME || "Metatron Event Scout",
  specialize: process.env.EVENT_SCRAPER_OWNER_SPECIALIZE || "Global Tech Events",
  avatar: process.env.EVENT_SCRAPER_OWNER_AVATAR || "",
};

const cleanText = (value = "") =>
  `${value}`
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const clampText = (value = "", fallback = "", max = 520) => {
  const text = cleanText(value || fallback);
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
};

const asArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(/[,|;/]/);
  return [];
};

const compact = (items) => [...new Set(items.map((item) => cleanText(item)).filter(Boolean))];

const canonicalUrl = (value = "") => {
  try {
    const url = new URL(value);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((key) =>
      url.searchParams.delete(key)
    );
    return url.toString();
  } catch {
    return `${value || ""}`.trim();
  }
};

const hashValue = (value) => crypto.createHash("sha1").update(value).digest("hex");

const hostProfiles = {
  "AI Fellowship Toronto": {
    name: "AI Fellowship Toronto",
    about: "AI Fellowship Toronto is a builder community focused on practical AI learning, demos, talks, and collaboration.",
    website: "https://theaifellowship.ca/developers",
  },
  "Google Developers": {
    name: "Google Developers",
    about: "Google Developers hosts technical events, product sessions, and community learning for developers building with Google technologies.",
    website: "https://developers.google.com/events",
  },
  "Foundercal": {
    name: "Foundercal",
    about: "Foundercal curates startup, founder, hackathon, workshop, and technology community events from major innovation hubs.",
    website: "https://foundercal.com/",
  },
  "Confs.tech": {
    name: "Confs.tech",
    about: "Confs.tech is an open conference calendar for software engineering, web, cloud, data, security, and developer communities.",
    website: "https://confs.tech/",
  },
  "conf.llc": {
    name: "conf.llc",
    about: "conf.llc indexes technology conferences and developer events from public event pages around the world.",
    website: "https://conf.llc/",
  },
};

const buildHostProfile = (event, title, hostLink) => {
  const sourceProfile = hostProfiles[event.sourceName] || {};
  const hostName = clampText(
    event.hostName || event.organizer || event.groupName || event.community || sourceProfile.name || event.sourceName || title,
    "Event Host",
    140
  );
  const hostAbout = clampText(
    event.hostAbout || event.organizerBio || event.hostDescription || sourceProfile.about,
    `${hostName} is hosting or listing this technology event. Use the official event page for registration, venue, and agenda details.`,
    520
  );

  return {
    name: hostName,
    about: hostAbout,
    website: canonicalUrl(event.hostWebsite || event.organizerUrl || sourceProfile.website || hostLink),
  };
};

const parseDate = (value) => {
  if (!value) return null;
  const raw = cleanText(value);
  let date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    const monthDay = raw.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}\b/i)?.[0];
    if (monthDay) {
      const year = Number(raw.match(/\b20\d{2}\b/)?.[0]) || new Date().getFullYear();
      date = new Date(`${monthDay} ${year}`);
      if (!/\b20\d{2}\b/.test(raw) && !Number.isNaN(date.getTime()) && date.getTime() < Date.now() - DAY_MS) {
        date = new Date(`${monthDay} ${year + 1}`);
      }
    }
  }
  return Number.isNaN(date.getTime()) ? null : date;
};

const isUpcoming = (date) => {
  const parsed = parseDate(date);
  return parsed && parsed.getTime() >= Date.now() - DAY_MS;
};

const inferCategory = (event) => {
  const text = `${event.title} ${event.about} ${asArray(event.tags).join(" ")}`.toLowerCase();
  if (/(cyber|security|infosec|privacy)/.test(text)) return "Cybersecurity";
  if (/(devops|kubernetes|cloud|sre|platform|infrastructure)/.test(text)) return "DevOps";
  if (/(data|analytics|database|postgres|sql)/.test(text)) return "Data";
  if (/(ai|machine learning|ml|genai|llm|deep learning)/.test(text)) return "AI/ML";
  if (/(javascript|typescript|frontend|react|web|css|html)/.test(text)) return "Web Development";
  if (/(ux|design|product)/.test(text)) return "Product Design";
  if (/(python|java|ruby|golang|rust|programming|software)/.test(text)) return "Software Development";
  return "Tech Event";
};

const inferTopics = (event) => {
  const text = `${event.title} ${event.about} ${asArray(event.tags).join(" ")}`.toLowerCase();
  const topics = [
    ["AI", /\bai\b|machine learning|genai|llm/],
    ["Cloud", /cloud|aws|azure|gcp/],
    ["Cybersecurity", /cyber|security|privacy/],
    ["Data", /data|analytics|database|sql/],
    ["DevOps", /devops|kubernetes|docker|sre|platform/],
    ["JavaScript", /javascript|typescript|react|vue|angular|node/],
    ["Open Source", /open source|opensource/],
    ["Product", /product|startup|founder/],
    ["Python", /python|django|fastapi/],
    ["Software Engineering", /software|developer|engineering|programming|code/],
    ["UX", /\bux\b|design/],
  ]
    .filter(([, regex]) => regex.test(text))
    .map(([label]) => label);

  return compact([...topics, ...asArray(event.tags), inferCategory(event)]).slice(0, 8);
};

const isTechEvent = (event) => {
  const text = `${event.title} ${event.about} ${asArray(event.tags).join(" ")}`.toLowerCase();
  return TECH_EVENT_TERMS.some((term) => text.includes(term));
};

const normalizeLocation = (event) => {
  const online = event.online || /online|virtual|remote/i.test(`${event.location || ""} ${event.city || ""} ${event.country || ""}`);
  if (online) return { country: "Global", state: "Online" };

  if (event.country || event.city) {
    return {
      country: cleanText(event.country || "Global"),
      state: cleanText(event.city || event.venue || "Event venue"),
    };
  }

  const location = cleanText(event.location || event.venue || "");
  if (!location) return { country: "Global", state: "Online" };

  const parts = location.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) {
    return {
      country: parts[parts.length - 1],
      state: parts.slice(0, -1).join(", "),
    };
  }

  return { country: location, state: "Event venue" };
};

const normalizeEvent = (event) => {
  const title = clampText(event.title || event.name, "Upcoming Tech Event", 170);
  const hostLink = canonicalUrl(event.url || event.registerUrl || event.hostLink || event.sourceUrl || "");
  const dateHosted = parseDate(event.date || event.startDate || event.start_at || event.startTime || event.eventDate);
  const about = clampText(
    event.about || event.description || event.fullDescription,
    `${title} is an upcoming technology event discovered from ${event.sourceName}. Check the official event page for the full agenda and registration details.`,
    720
  );
  const topics = inferTopics({ ...event, title, about });
  const externalId = `${event.externalId || hashValue(`${event.sourceName}:${hostLink}:${title}:${dateHosted?.toISOString()}`).slice(0, 18)}`;
  const host = buildHostProfile(event, title, hostLink);

  return {
    title,
    hostLink,
    skills: topics,
    users: {
      count: 0,
      value: [],
    },
    dateHosted,
    about,
    category: inferCategory({ ...event, title, about }),
    isDisabled: false,
    ownerAvatar: event.hostAvatar || event.logo || EVENT_OWNER.avatar,
    ownerId: EVENT_OWNER.id,
    ownerName: host.name,
    ownerSpecialize: host.about,
    hostAbout: host.about,
    hostWebsite: host.website,
    externalEvent: true,
    topics,
    location: normalizeLocation(event),
    source: {
      name: event.sourceName,
      type: event.sourceType || "event-feed",
      externalId,
      url: hostLink,
      scrapedAt: new Date(),
    },
  };
};

const fetchJsonDocument = async (browser, url) => {
  const page = await browser.newPage();
  try {
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 MetatronEventUpdater/1.0"
    );
    await page.setExtraHTTPHeaders({ "accept-language": "en-US,en;q=0.9" });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: REQUEST_TIMEOUT });
    const body = await page.evaluate(() => document.body.innerText);
    return JSON.parse(body);
  } finally {
    await page.close();
  }
};

const scrapePage = async (browser, url, evaluate) => {
  const page = await browser.newPage();
  try {
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 MetatronEventUpdater/1.0"
    );
    await page.setExtraHTTPHeaders({ "accept-language": "en-US,en;q=0.9" });
    await page.goto(url, { waitUntil: "networkidle2", timeout: REQUEST_TIMEOUT });
    return await page.evaluate(evaluate);
  } finally {
    await page.close();
  }
};

const eventAdapters = [
  {
    name: "Confs.tech",
    run: async (browser, perSourceLimit) => {
      const year = new Date().getFullYear();
      const topics = ["ai", "api", "data", "devops", "javascript", "python", "security", "sre", "typescript", "ux"];
      const urls = [year, year + 1].flatMap((eventYear) =>
        topics.map((topic) => ({
          topic,
          eventYear,
          url: `https://raw.githubusercontent.com/tech-conferences/conference-data/main/conferences/${eventYear}/${topic}.json`,
        }))
      );

      const results = await Promise.all(
        urls.map(async ({ topic, eventYear, url }) => {
          try {
            const data = await fetchJsonDocument(browser, url);
            return data.map((item) => ({
              sourceName: "Confs.tech",
              sourceType: `confs-tech:${topic}:${eventYear}`,
              externalId: `${eventYear}-${topic}-${item.name}-${item.startDate}`,
              title: item.name,
              url: item.url,
              date: item.startDate,
              endDate: item.endDate,
              city: item.city,
              country: item.country,
              online: item.online,
              hostName: item.name,
              hostWebsite: item.url,
              hostAbout: `${item.name} is the official conference host for this ${topic} technology event${item.city || item.country ? ` in ${[item.city, item.country].filter(Boolean).join(", ")}` : ""}.`,
              tags: [topic, item.locales].filter(Boolean),
              about: `${item.name} is a ${topic} technology conference${item.endDate ? ` running through ${item.endDate}` : ""}.`,
            }));
          } catch {
            return [];
          }
        })
      );

      return results.flat().filter((event) => isUpcoming(event.date)).slice(0, perSourceLimit);
    },
  },
  {
    name: "Foundercal",
    run: async (browser, perSourceLimit) => {
      const discovery = await fetchJsonDocument(browser, "https://foundercal.com/api/events.json");
      const preferredCities = ["sf", "nyc", "berlin", "london", "toronto", "paris", "singapore", "bengaluru"];
      const validCities = new Set(discovery.valid_cities || []);
      const cities = preferredCities.filter((city) => validCities.has(city)).slice(0, 6);
      const types = ["conference", "hackathon", "workshop", "meetup"];

      const results = await Promise.all(
        cities.flatMap((city) =>
          types.map(async (type) => {
            try {
              const data = await fetchJsonDocument(browser, `https://foundercal.com/api/events.json?city=${city}&type=${type}&limit=8`);
              return (data.events || []).map((item) => ({
                sourceName: "Foundercal",
                sourceType: `foundercal:${city}:${type}`,
                externalId: item.event_url || item.register_url || `${city}-${type}-${item.title}-${item.start_at}`,
                title: item.title,
                url: item.register_url || item.event_url,
                date: item.start_at,
                location: item.venue,
                city: item.city,
                hostName: item.organizer || item.host || item.company || item.group || item.title,
                hostWebsite: item.organizer_url || item.company_url || item.event_url || item.register_url,
                hostAbout: item.organizer_description || item.host_description || item.description,
                tags: [item.type, ...(item.speakers || [])].slice(0, 6),
                about: item.description,
              }));
            } catch {
              return [];
            }
          })
        )
      );

      return results.flat().filter((event) => isUpcoming(event.date)).slice(0, perSourceLimit);
    },
  },
  {
    name: "AI Fellowship Toronto",
    run: async (browser, perSourceLimit) => {
      const data = await fetchJsonDocument(browser, `https://rmxirzudhsautnsrdvib.supabase.co/functions/v1/public-events?limit=${perSourceLimit}`);
      return (data.events || []).map((item) => ({
        sourceName: "AI Fellowship Toronto",
        externalId: item.id,
        title: item.title,
        url: item.externalUrl || item.url,
        date: item.startTime || item.eventDate,
        location: item.location,
        country: item.format === "online" ? "Global" : "Canada",
        city: item.format === "online" ? "Online" : "Toronto",
        hostName: item.hostName || item.organizerName || "AI Fellowship Toronto",
        hostWebsite: item.hostUrl || item.externalUrl || item.url || "https://theaifellowship.ca/developers",
        hostAbout: item.hostBio || item.organizerBio,
        tags: [item.topic, item.level, item.format].filter(Boolean),
        about: item.fullDescription || item.description,
      }));
    },
  },
  {
    name: "Google Developers",
    run: async (browser, perSourceLimit) => {
      const rows = await scrapePage(browser, "https://developers.google.com/events", () => {
        const rowEvents = [...document.querySelectorAll("tr")].map((row) => {
          const cells = [...row.querySelectorAll("td")].map((cell) => cell.textContent.trim()).filter(Boolean);
          const link = row.querySelector("a[href]")?.href;
          return {
            cells,
            link,
          };
        });

        const cardEvents = [...document.querySelectorAll("a[href*='/events/'], article, .devsite-card")].map((node) => ({
          text: node.textContent.trim(),
          link: node.href || node.querySelector?.("a[href]")?.href,
        }));

        return { rowEvents, cardEvents };
      });

      const fromRows = rows.rowEvents
        .filter((row) => row.cells.length >= 3)
        .map((row) => {
          const year = row.cells.find((cell) => /^20\d{2}$/.test(cell));
          return {
            sourceName: "Google Developers",
            externalId: row.link || row.cells.join("-"),
            title: row.cells[1] || row.cells[0],
            url: row.link || "https://developers.google.com/events",
            date: year ? `${row.cells[0]} ${year}` : row.cells[0],
            location: row.cells[3] || row.cells[2] || "Global",
            hostName: "Google Developers",
            hostWebsite: "https://developers.google.com/events",
            tags: [row.cells[2], "Google Developers"].filter(Boolean),
            about: row.cells.join(" "),
          };
        });

      const fromCards = rows.cardEvents
        .filter((item) => item.text && /\b(2026|2027|online|cloud|android|ai|developer|build)\b/i.test(item.text))
        .map((item) => {
          const dateText = item.text.match(/[A-Z][a-z]+ \d{1,2}(?:,? \d{4})?/)?.[0];
          const year = item.text.match(/\b20\d{2}\b/)?.[0];
          return {
            sourceName: "Google Developers",
            externalId: item.link || item.text.slice(0, 100),
            title: item.text.split("\n").map((part) => part.trim()).filter(Boolean)[0],
            url: item.link || "https://developers.google.com/events",
            date: dateText && !/\b20\d{2}\b/.test(dateText) && year ? `${dateText} ${year}` : dateText,
            location: /online/i.test(item.text) ? "Online" : "Global",
            hostName: "Google Developers",
            hostWebsite: "https://developers.google.com/events",
            tags: ["Google Developers"],
            about: item.text,
          };
        });

      return [...fromRows, ...fromCards].filter((event) => isUpcoming(event.date)).slice(0, perSourceLimit);
    },
  },
  {
    name: "conf.llc",
    run: async (browser, perSourceLimit) => {
      const events = await scrapePage(browser, "https://conf.llc/", () =>
        [...document.querySelectorAll("article, li, .conference, a[href]")].map((node) => {
          const text = node.textContent.trim().replace(/\s+/g, " ");
          const link = node.href || node.querySelector?.("a[href]")?.href;
          return { text, link };
        })
      );

      return events
        .filter((item) => item.text && item.link && /\b(2026|2027|sep|oct|nov|dec|jan|feb|mar|apr|may|jun|jul|aug)\b/i.test(item.text))
        .map((item) => ({
          sourceName: "conf.llc",
          externalId: item.link || item.text.slice(0, 100),
          title: item.text.split(/ · | in |\d{1,2}/)[0].slice(0, 140),
          url: item.link,
          date: item.text.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? \d{1,2}(?:,? 20\d{2})?/i)?.[0],
          location: item.text,
          hostName: item.text.split(/ · | in |\d{1,2}/)[0].slice(0, 140),
          hostWebsite: item.link,
          tags: ["Conference"],
          about: item.text,
        }))
        .filter((event) => isTechEvent(event))
        .slice(0, perSourceLimit);
    },
  },
];

const launchBrowser = () => {
  const launchOptions = {
    headless: "new",
    args: [
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  };

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  return puppeteer.launch(launchOptions);
};

const collectEvents = async ({ browser, perSourceLimit }) => {
  const settled = await Promise.allSettled(
    eventAdapters.map(async (adapter) => {
      const events = await adapter.run(browser, perSourceLimit);
      return {
        name: adapter.name,
        count: events.length,
        events,
      };
    })
  );

  const summary = settled.map((result, index) => {
    const adapter = eventAdapters[index];
    if (result.status === "fulfilled") {
      return { source: result.value.name, fetched: result.value.count, error: "" };
    }

    return {
      source: adapter.name,
      fetched: 0,
      error: result.reason?.message || "source failed",
    };
  });

  return {
    summary,
    events: settled
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value.events),
  };
};

const dedupeEvents = (events) => {
  const seen = new Set();
  const exactUnique = events.filter((event) => {
    const key = event.hostLink || canonicalRecordKey([event.title, event.dateHosted, event.location?.country]);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return uniqueByCloseness(exactUnique, areCloseEvents);
};

const saveNewEvents = async (events, dryRun = false) => {
  if (!events.length) return { inserted: [], skipped: 0 };
  if (dryRun) return { inserted: [], skipped: 0, pending: events.length };

  const or = events.flatMap((event) => {
    const filters = [];
    if (event.hostLink) filters.push({ hostLink: event.hostLink });
    if (event.source?.name && event.source?.externalId) {
      filters.push({
        "source.name": event.source.name,
        "source.externalId": event.source.externalId,
      });
    }
    return filters;
  });

  const existing = or.length
    ? await AddEventModel.find({ $or: or }).select("hostLink source.name source.externalId").lean()
    : [];

  const existingKeys = new Set(
    existing.flatMap((event) => [
      event.hostLink,
      event.source?.name && event.source?.externalId ? `${event.source.name}:${event.source.externalId}` : "",
    ])
  );

  const exactNewEvents = events.filter((event) => {
    const sourceKey = event.source?.name && event.source?.externalId ? `${event.source.name}:${event.source.externalId}` : "";
    return !existingKeys.has(event.hostLink) && !existingKeys.has(sourceKey);
  });

  const existingComparableEvents = await AddEventModel.find({ dateHosted: { $gte: new Date(Date.now() - DAY_MS) } })
    .sort({ dateHosted: 1 })
    .limit(1800)
    .select("title location dateHosted hostLink")
    .lean();

  const newEvents = exactNewEvents.filter(
    (event) => !existingComparableEvents.some((existingEvent) => areCloseEvents(existingEvent, event))
  );

  if (!newEvents.length) {
    return { inserted: [], skipped: events.length - newEvents.length, pending: newEvents.length };
  }

  const inserted = await AddEventModel.insertMany(newEvents, { ordered: false });
  return { inserted, skipped: events.length - newEvents.length };
};

export const scrapeAndSaveUpcomingTechEvents = async ({ limit = DEFAULT_LIMIT, perSourceLimit = DEFAULT_PER_SOURCE_LIMIT, dryRun = false } = {}) => {
  const browser = await launchBrowser();
  try {
    const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), 300);
    const safePerSourceLimit = Math.min(Math.max(Number(perSourceLimit) || DEFAULT_PER_SOURCE_LIMIT, 1), 80);
    const { events, summary } = await collectEvents({ browser, perSourceLimit: safePerSourceLimit });
    const structured = dedupeEvents(
      events
        .filter((event) => event.title && (event.url || event.hostLink) && isUpcoming(event.date || event.startDate || event.start_at || event.startTime || event.eventDate))
        .filter(isTechEvent)
        .map(normalizeEvent)
        .filter((event) => event.dateHosted)
        .sort((a, b) => new Date(a.dateHosted).getTime() - new Date(b.dateHosted).getTime())
        .slice(0, safeLimit)
    );
    const normalized = await enrichEventLogos(browser, structured);

    const saveResult = await saveNewEvents(normalized, dryRun);

    return {
      fetched: events.length,
      structured: normalized.length,
      inserted: saveResult.inserted.length,
      skipped: saveResult.skipped,
      pending: saveResult.pending || 0,
      dryRun,
      sources: summary,
      events: (dryRun ? normalized.slice(0, 20) : saveResult.inserted).map((event) => ({
        _id: event._id,
        title: event.title,
        hostLink: event.hostLink,
        dateHosted: event.dateHosted,
        hostName: event.ownerName,
        hostAbout: event.hostAbout,
        ownerAvatar: event.ownerAvatar,
        source: event.source,
      })),
    };
  } finally {
    await browser.close();
  }
};
