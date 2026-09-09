import crypto from "crypto";
import puppeteer from "puppeteer";
import JobPostModel from "../model/JobPostModel.js";
import { areCloseJobs, canonicalRecordKey, uniqueByCloseness } from "./scraperDedupe.js";
import { enrichJobLogos } from "./scraperLogoService.js";

const DEFAULT_LIMIT = 160;
const DEFAULT_PER_SOURCE_LIMIT = 35;
const REQUEST_TIMEOUT = 28000;

const TECH_TERMS = [
  "software",
  "developer",
  "engineer",
  "frontend",
  "front end",
  "backend",
  "back end",
  "fullstack",
  "full stack",
  "javascript",
  "typescript",
  "react",
  "node",
  "python",
  "java",
  "golang",
  "ruby",
  "php",
  "mobile",
  "android",
  "ios",
  "devops",
  "cloud",
  "sre",
  "platform",
  "security",
  "cyber",
  "data",
  "analytics",
  "machine learning",
  "ml",
  "ai",
  "product manager",
  "designer",
  "ux",
  "qa",
  "test",
  "database",
  "systems",
  "support engineer",
];

const NON_TECH_TITLE_TERMS = [
  "account executive",
  "sales",
  "marketing",
  "legal",
  "recruiter",
  "talent acquisition",
  "finance",
  "accounting",
  "people partner",
  "hr ",
  "customer success",
  "business development",
  "office manager",
  "workplace",
  "executive assistant",
];

const SKILL_KEYWORDS = [
  "JavaScript",
  "TypeScript",
  "React",
  "Vue",
  "Angular",
  "Node.js",
  "Python",
  "Django",
  "FastAPI",
  "Java",
  "Spring",
  "Kotlin",
  "Swift",
  "Android",
  "iOS",
  "Flutter",
  "React Native",
  "Go",
  "Rust",
  "Ruby",
  "Rails",
  "PHP",
  "Laravel",
  "C#",
  ".NET",
  "C++",
  "SQL",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "GraphQL",
  "AWS",
  "Azure",
  "GCP",
  "Docker",
  "Kubernetes",
  "Terraform",
  "Linux",
  "CI/CD",
  "DevOps",
  "Security",
  "Machine Learning",
  "Data Engineering",
  "Data Analysis",
  "Product Management",
  "UI/UX",
  "QA",
];

const SOURCE_CONTACT = {
  email: process.env.JOB_SCRAPER_EMAIL || process.env.DEV_EMAIL || process.env.BREVO_FROM || "jobs@metatron.dev",
  phone: process.env.JOB_SCRAPER_PHONE || process.env.DEV_PHONE || "+000000000",
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

const clampText = (value = "", fallback = "", max = 420) => {
  const text = cleanText(value || fallback);
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
};

const asArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(/[,|;/]/);
  return [];
};

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

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const compact = (items) => [...new Set(items.map((item) => cleanText(item)).filter(Boolean))];

const isTechListing = (listing) => {
  const title = `${listing.title || ""}`.toLowerCase();
  if (NON_TECH_TITLE_TERMS.some((term) => title.includes(term))) return false;

  const highSignal = [
    listing.title,
    listing.category,
    ...asArray(listing.tags),
  ]
    .join(" ")
    .toLowerCase();

  if (TECH_TERMS.some((term) => highSignal.includes(term))) return true;

  const haystack = [
    listing.title,
    listing.company,
    listing.category,
    listing.description,
    ...asArray(listing.tags),
  ]
    .join(" ")
    .toLowerCase();

  return TECH_TERMS.some((term) => haystack.includes(term));
};

const inferCategory = (title = "", description = "", tags = []) => {
  const text = `${title} ${description} ${asArray(tags).join(" ")}`.toLowerCase();
  if (/(data scientist|machine learning|\bml\b|\bai\b|deep learning|computer vision|nlp)/.test(text)) return "Machine Learning Engineer";
  if (/(data engineer|analytics|analyst|business intelligence|\bbi\b|warehouse)/.test(text)) return "Data Engineer";
  if (/(devops|site reliability|\bsre\b|platform|infrastructure|kubernetes|terraform|cloud)/.test(text)) return "DevOps Engineer";
  if (/(security|cyber|penetration|infosec|application security)/.test(text)) return "Cybersecurity Engineer";
  if (/(frontend|front end|react|vue|angular|ui engineer)/.test(text)) return "Frontend Developer";
  if (/(backend|back end|api|server|node|django|rails|golang|java)/.test(text)) return "Backend Developer";
  if (/(mobile|android|ios|flutter|react native)/.test(text)) return "Mobile App Developer";
  if (/(product manager|product owner)/.test(text)) return "Product Manager";
  if (/(designer|ux|ui\/ux|product design)/.test(text)) return "UI/UX Designer";
  if (/(qa|quality|test automation|tester)/.test(text)) return "Software Tester";
  return "Software Engineer";
};

const inferSkills = (title = "", description = "", tags = []) => {
  const sourceTags = asArray(tags).map((tag) => cleanText(tag));
  const text = `${title} ${description} ${sourceTags.join(" ")}`.toLowerCase();
  const matched = SKILL_KEYWORDS.filter((skill) => text.includes(skill.toLowerCase()));
  return compact([...sourceTags, ...matched, inferCategory(title, description, tags)]).slice(0, 10);
};

const inferJobType = (value = "", title = "") => {
  const text = `${value} ${title}`.toLowerCase();
  if (text.includes("intern")) return "Internship";
  if (text.includes("volunteer")) return "Volunteer";
  if (text.includes("contract") || text.includes("freelance")) return "Contract";
  return "Full-Time";
};

const inferAccess = (value = "", location = "") => {
  const text = `${value} ${location}`.toLowerCase();
  if (text.includes("hybrid")) return "Hybrid";
  if (text.includes("remote") || text.includes("worldwide") || text.includes("anywhere")) return "Remote";
  return "Onsite";
};

const inferEntry = (title = "", level = "") => {
  const text = `${title} ${level}`.toLowerCase();
  if (text.includes("intern")) {
    return { level: "Internship Level", years: "1-2 Years of Experience" };
  }
  if (/(junior|graduate|entry|associate)/.test(text)) {
    return { level: "Entry Level", years: "1-2 Years of Experience" };
  }
  if (/(senior|staff|principal|lead|manager|head of|director)/.test(text)) {
    return { level: "Professional Level", years: "4-6 Years of Experience" };
  }
  return { level: "Intermediate Level", years: "2-4 Years of Experience" };
};

const normalizeSalary = (listing) => {
  if (listing.salary) return clampText(listing.salary, "Not disclosed", 120);
  if (listing.salaryMin || listing.salaryMax) {
    const min = listing.salaryMin ? Number(listing.salaryMin).toLocaleString("en-US") : "";
    const max = listing.salaryMax ? Number(listing.salaryMax).toLocaleString("en-US") : "";
    return `USD ${min || "0"} - USD ${max || "Not disclosed"}`;
  }
  return "Not disclosed";
};

const normalizeLocation = (location = "", access = "Remote") => {
  const text = cleanText(location);
  if (!text || /worldwide|anywhere|global|remote/i.test(text)) {
    return { country: "Global", state: access };
  }

  const parts = text.split(",").map((item) => item.trim()).filter(Boolean);
  if (parts.length > 1) {
    return {
      country: parts[parts.length - 1],
      state: parts.slice(0, -1).join(", "),
    };
  }

  return { country: text, state: access };
};

const buildDescriptions = (listing) => {
  const description = cleanText(listing.description || listing.excerpt || "");
  if (!description) {
    return [
      `Latest external tech role discovered from ${listing.sourceName}.`,
      "Open the official job post to review responsibilities, compensation, and application instructions.",
    ];
  }

  const sentences = description
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => clampText(sentence, "", 260))
    .filter((sentence) => sentence.length > 35)
    .slice(0, 5);

  return sentences.length
    ? sentences
    : [clampText(description, `External tech role discovered from ${listing.sourceName}.`, 260)];
};

const normalizeListing = (listing) => {
  const title = clampText(listing.title, "Software Engineer", 160);
  const company = clampText(listing.company, "External hiring team", 140);
  const sourceUrl = canonicalUrl(listing.url || listing.sourceUrl || "");
  const descriptionText = cleanText(listing.description || listing.excerpt || "");
  const access = inferAccess(listing.access, listing.location);
  const skills = inferSkills(title, descriptionText, listing.tags);
  const entry = inferEntry(title, listing.level);
  const externalId = `${listing.externalId || hashValue(`${listing.sourceName}:${sourceUrl}:${title}:${company}`).slice(0, 18)}`;

  return {
    title,
    category: inferCategory(title, descriptionText, listing.tags),
    organisation: {
      name: company,
      about: clampText(
        listing.companyAbout,
        `${company} is hiring through ${listing.sourceName}. Verify organisation details on the official listing before applying.`,
        320
      ),
    },
    jobtypeaccess: {
      type: inferJobType(listing.jobType, title),
      access,
    },
    logo: canonicalUrl(listing.logo || ""),
    logoID: "",
    skills: skills.length ? skills : ["Software Engineering"],
    requirements: {
      document: "Curriculum Vitae (CV)",
      qualification: compact([
        ...skills.slice(0, 4).map((skill) => `Experience with ${skill}`),
        "Review the official external job post before applying.",
      ]).slice(0, 6),
      description: buildDescriptions({ ...listing, description: descriptionText }),
    },
    entry,
    website: sourceUrl,
    salary: normalizeSalary(listing),
    whitelist: access === "Remote" ? "All" : normalizeLocation(listing.location, access).country,
    applicants_max: 500,
    location: normalizeLocation(listing.location, access),
    data_email: "",
    my_email: SOURCE_CONTACT.email,
    my_phone: SOURCE_CONTACT.phone,
    applicants: {
      total: 0,
      male: 0,
      female: 0,
      assessed: 0,
      other: 0,
    },
    status: "active",
    source: {
      name: listing.sourceName,
      type: listing.sourceType || "job-board",
      externalId,
      url: sourceUrl,
      postedAt: parseDate(listing.publishedAt),
      scrapedAt: new Date(),
    },
  };
};

const fetchJsonDocument = async (browser, url) => {
  const page = await browser.newPage();
  try {
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 MetatronJobUpdater/1.0"
    );
    await page.setExtraHTTPHeaders({ "accept-language": "en-US,en;q=0.9" });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: REQUEST_TIMEOUT });
    const body = await page.evaluate(() => document.body.innerText);
    return JSON.parse(body);
  } finally {
    await page.close();
  }
};

const sourceAdapters = [
  {
    name: "RemoteOK",
    run: async (browser, perSourceLimit) => {
      const data = await fetchJsonDocument(browser, "https://remoteok.com/api");
      return data
        .filter((item) => item?.position && item?.company)
        .slice(0, perSourceLimit)
        .map((item) => ({
          sourceName: "RemoteOK",
          externalId: item.id,
          title: item.position,
          company: item.company,
          location: item.location || "Remote",
          access: "Remote",
          jobType: item.job_type,
          tags: item.tags,
          description: item.description,
          salaryMin: item.salary_min,
          salaryMax: item.salary_max,
          logo: item.company_logo,
          url: item.url,
          publishedAt: item.date,
        }));
    },
  },
  {
    name: "Remotive",
    run: async (browser, perSourceLimit) => {
      const data = await fetchJsonDocument(browser, "https://remotive.com/api/remote-jobs?category=software-dev");
      return (data.jobs || []).slice(0, perSourceLimit).map((item) => ({
        sourceName: "Remotive",
        externalId: item.id,
        title: item.title,
        company: item.company_name,
        location: item.candidate_required_location || "Remote",
        access: "Remote",
        jobType: item.job_type,
        tags: item.tags,
        description: item.description,
        salary: item.salary,
        logo: item.company_logo_url,
        url: item.url,
        publishedAt: item.publication_date,
      }));
    },
  },
  {
    name: "Arbeitnow",
    run: async (browser, perSourceLimit) => {
      const data = await fetchJsonDocument(browser, "https://www.arbeitnow.com/api/job-board-api");
      return (data.data || []).slice(0, perSourceLimit).map((item) => ({
        sourceName: "Arbeitnow",
        externalId: item.slug,
        title: item.title,
        company: item.company_name,
        location: item.location || "Germany",
        access: item.remote ? "Remote" : "Onsite",
        tags: item.tags,
        description: item.description,
        url: item.url,
        publishedAt: item.created_at ? new Date(item.created_at * 1000).toISOString() : null,
      }));
    },
  },
  {
    name: "Jobicy",
    run: async (browser, perSourceLimit) => {
      const data = await fetchJsonDocument(browser, `https://jobicy.com/api/v2/remote-jobs?industry=engineering&count=${perSourceLimit}`);
      return (data.jobs || []).map((item) => ({
        sourceName: "Jobicy",
        externalId: item.id,
        title: item.jobTitle,
        company: item.companyName,
        location: item.jobGeo || "Remote",
        access: "Remote",
        jobType: item.jobType?.join?.(", "),
        level: item.jobLevel,
        tags: [...asArray(item.jobIndustry), ...asArray(item.jobLevel)],
        description: item.jobExcerpt || item.jobDescription,
        salaryMin: item.annualSalaryMin,
        salaryMax: item.annualSalaryMax,
        logo: item.companyLogo,
        url: item.url,
        publishedAt: item.pubDate,
      }));
    },
  },
  {
    name: "Greenhouse",
    run: async (browser, perSourceLimit) => {
      const boards = ["airbnb", "databricks", "discord", "figma", "grammarly", "hashicorp", "stripe"];
      const results = await Promise.all(
        boards.map(async (board) => {
          try {
            const data = await fetchJsonDocument(browser, `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`);
            return (data.jobs || []).map((item) => ({
              sourceName: "Greenhouse",
              sourceType: `greenhouse:${board}`,
              externalId: item.id,
              title: item.title,
              company: item.company_name || board,
              location: item.location?.name,
              jobType: item.metadata?.find?.((meta) => /employment/i.test(meta.name))?.value,
              tags: [item.departments?.[0]?.name, item.offices?.[0]?.name].filter(Boolean),
              description: item.content,
              url: item.absolute_url,
              publishedAt: item.first_published || item.updated_at,
            }));
          } catch {
            return [];
          }
        })
      );

      return results.flat().slice(0, perSourceLimit);
    },
  },
  {
    name: "Ashby",
    run: async (browser, perSourceLimit) => {
      const companies = ["linear", "notion", "perplexity", "replit"];
      const results = await Promise.all(
        companies.map(async (company) => {
          try {
            const data = await fetchJsonDocument(browser, `https://api.ashbyhq.com/posting-api/job-board/${company}`);
            return (data.jobs || []).map((item) => ({
              sourceName: "Ashby",
              sourceType: `ashby:${company}`,
              externalId: item.id,
              title: item.title,
              company,
              location: item.location || item.address?.postalAddress?.addressCountry,
              access: item.workplaceType || (item.isRemote ? "Remote" : ""),
              jobType: item.employmentType,
              level: item.department,
              tags: [item.department, item.team, item.employmentType].filter(Boolean),
              description: item.descriptionHtml,
              url: item.jobUrl || item.applyUrl,
              publishedAt: item.publishedAt,
            }));
          } catch {
            return [];
          }
        })
      );

      return results.flat().slice(0, perSourceLimit);
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

const collectListings = async ({ browser, perSourceLimit }) => {
  const settled = await Promise.allSettled(
    sourceAdapters.map(async (adapter) => {
      const listings = await adapter.run(browser, perSourceLimit);
      return {
        name: adapter.name,
        count: listings.length,
        listings,
      };
    })
  );

  const summary = settled.map((result, index) => {
    const adapter = sourceAdapters[index];
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
    listings: settled
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value.listings),
  };
};

const dedupeListings = (jobs) => {
  const seen = new Set();
  const exactUnique = jobs.filter((job) => {
    const key = job.website || canonicalRecordKey([job.title, job.organisation?.name, job.location?.country]);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return uniqueByCloseness(exactUnique, areCloseJobs);
};

const saveNewJobs = async (jobs, dryRun = false) => {
  if (!jobs.length) return { inserted: [], skipped: 0 };
  if (dryRun) return { inserted: [], skipped: 0, pending: jobs.length };

  const or = jobs.flatMap((job) => {
    const filters = [];
    if (job.website) filters.push({ website: job.website });
    if (job.source?.name && job.source?.externalId) {
      filters.push({
        "source.name": job.source.name,
        "source.externalId": job.source.externalId,
      });
    }
    return filters;
  });

  const existing = or.length
    ? await JobPostModel.find({ $or: or }).select("website source.name source.externalId").lean()
    : [];

  const existingKeys = new Set(
    existing.flatMap((job) => [
      job.website,
      job.source?.name && job.source?.externalId ? `${job.source.name}:${job.source.externalId}` : "",
    ])
  );

  const exactNewJobs = jobs.filter((job) => {
    const sourceKey = job.source?.name && job.source?.externalId ? `${job.source.name}:${job.source.externalId}` : "";
    return !existingKeys.has(job.website) && !existingKeys.has(sourceKey);
  });

  const existingComparableJobs = await JobPostModel.find({})
    .sort({ createdAt: -1 })
    .limit(1800)
    .select("title organisation.name location jobtypeaccess.access website")
    .lean();

  const newJobs = exactNewJobs.filter(
    (job) => !existingComparableJobs.some((existingJob) => areCloseJobs(existingJob, job))
  );

  if (!newJobs.length) {
    return { inserted: [], skipped: jobs.length - newJobs.length, pending: newJobs.length };
  }

  const inserted = await JobPostModel.insertMany(newJobs, { ordered: false });
  return { inserted, skipped: jobs.length - newJobs.length };
};

export const scrapeAndSaveLatestTechJobs = async ({ limit = DEFAULT_LIMIT, perSourceLimit = DEFAULT_PER_SOURCE_LIMIT, dryRun = false } = {}) => {
  const browser = await launchBrowser();
  try {
    const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), 300);
    const safePerSourceLimit = Math.min(Math.max(Number(perSourceLimit) || DEFAULT_PER_SOURCE_LIMIT, 1), 80);
    const { listings, summary } = await collectListings({ browser, perSourceLimit: safePerSourceLimit });
    const structured = dedupeListings(
      listings
        .filter((listing) => listing.title && listing.company && (listing.url || listing.sourceUrl))
        .filter(isTechListing)
        .map(normalizeListing)
        .sort((a, b) => {
          const bDate = b.source?.postedAt ? new Date(b.source.postedAt).getTime() : 0;
          const aDate = a.source?.postedAt ? new Date(a.source.postedAt).getTime() : 0;
          return bDate - aDate;
        })
        .slice(0, safeLimit)
    );
    const normalized = await enrichJobLogos(browser, structured);

    const saveResult = await saveNewJobs(normalized, dryRun);

    return {
      fetched: listings.length,
      structured: normalized.length,
      inserted: saveResult.inserted.length,
      skipped: saveResult.skipped,
      pending: saveResult.pending || 0,
      dryRun,
      sources: summary,
      jobs: saveResult.inserted.map((job) => ({
        _id: job._id,
        title: job.title,
        organisation: job.organisation,
        logo: job.logo,
        website: job.website,
        source: job.source,
      })),
    };
  } finally {
    await browser.close();
  }
};
