import crypto from "crypto";
import puppeteer from "puppeteer";
import PostCourseModel from "../model/PostCourseModel.js";
import { areCloseCourses, canonicalRecordKey, uniqueByCloseness } from "./scraperDedupe.js";
import { enrichCourseLogos } from "./scraperLogoService.js";

const DEFAULT_LIMIT = 120;
const DEFAULT_PER_SOURCE_LIMIT = 30;
const REQUEST_TIMEOUT = 30000;

const TECH_COURSE_TERMS = [
  "ai",
  "algorithm",
  "android",
  "api",
  "azure",
  "backend",
  "cloud",
  "computer science",
  "cybersecurity",
  "data",
  "database",
  "developer",
  "devops",
  "engineering",
  "frontend",
  "full stack",
  "generative ai",
  "github",
  "javascript",
  "kubernetes",
  "machine learning",
  "microsoft",
  "node",
  "programming",
  "python",
  "react",
  "security",
  "software",
  "sql",
  "typescript",
  "web",
];

const COURSE_OWNER = {
  id: process.env.COURSE_SCRAPER_OWNER_ID || "external-tech-courses",
  name: process.env.COURSE_SCRAPER_OWNER_NAME || "Metatron Course Scout",
  title: process.env.COURSE_SCRAPER_OWNER_TITLE || "Global Tech Courses",
  avatar: process.env.COURSE_SCRAPER_OWNER_AVATAR || "",
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

const clampText = (value = "", fallback = "", max = 720) => {
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

const titleFromSlug = (slug = "") =>
  cleanText(slug)
    .split("-")
    .filter(Boolean)
    .map((word) => `${word[0]?.toUpperCase() || ""}${word.slice(1)}`)
    .join(" ");

const canonicalUrl = (value = "") => {
  try {
    const url = new URL(value);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "WT.mc_id"].forEach((key) =>
      url.searchParams.delete(key)
    );
    return url.toString();
  } catch {
    return `${value || ""}`.trim();
  }
};

const hashValue = (value) => crypto.createHash("sha1").update(value).digest("hex");

const absoluteUrl = (value = "", base = "") => {
  try {
    return new URL(value, base || undefined).toString();
  } catch {
    return `${value || ""}`.trim();
  }
};

const inferCategory = (course) => {
  const text = `${course.title} ${course.description} ${asArray(course.tags).join(" ")}`.toLowerCase();
  if (/(security|cyber|infosec|privacy)/.test(text)) return "Cybersecurity";
  if (/(devops|kubernetes|docker|sre|cloud|azure|aws|gcp)/.test(text)) return "Cloud & DevOps";
  if (/(data|analytics|database|sql|pandas|visualization)/.test(text)) return "Data Science";
  if (/(ai|machine learning|ml|generative|llm|deep learning)/.test(text)) return "AI/ML";
  if (/(javascript|typescript|react|frontend|web|html|css)/.test(text)) return "Web Development";
  if (/(backend|api|node|django|fastapi|server)/.test(text)) return "Backend Development";
  if (/(android|ios|mobile|flutter|kotlin|swift)/.test(text)) return "Mobile Development";
  if (/(algorithm|computer science|discrete mathematics|data structure)/.test(text)) return "Computer Science";
  return "Software Development";
};

const inferSubtopics = (course) => {
  const text = `${course.title} ${course.description} ${asArray(course.tags).join(" ")}`.toLowerCase();
  const topics = [
    ["AI", /\bai\b|generative|llm|machine learning|deep learning/],
    ["Algorithms", /algorithm|data structure|computer science/],
    ["Cloud", /cloud|azure|aws|gcp/],
    ["Cybersecurity", /security|cyber|infosec|privacy/],
    ["Data", /data|analytics|pandas|database|sql|visualization/],
    ["DevOps", /devops|docker|kubernetes|sre|terraform/],
    ["JavaScript", /javascript|typescript|react|node|frontend|web/],
    ["Mobile", /android|ios|flutter|kotlin|swift|mobile/],
    ["Python", /python|django|fastapi/],
    ["Software Engineering", /software|developer|engineering|programming|code/],
  ]
    .filter(([, regex]) => regex.test(text))
    .map(([label]) => label);

  return compact([...topics, ...asArray(course.tags), inferCategory(course)]).slice(0, 5);
};

const isTechCourse = (course) => {
  const text = `${course.title} ${course.description} ${asArray(course.tags).join(" ")}`.toLowerCase();
  return TECH_COURSE_TERMS.some((term) => text.includes(term));
};

const normalizeRating = (course) => {
  const rating = Number(course.ratingAverage || course.rating || 0);
  if (rating > 0 && rating <= 5) return Number(rating.toFixed(1));

  const popularity = Number(course.popularity || course.score || 0);
  if (popularity > 0 && popularity <= 1) return Number(Math.max(3.8, 4 + popularity).toFixed(1));
  if (popularity > 1 && popularity <= 10) return Number(Math.min(5, popularity / 2).toFixed(1));

  return 4.5;
};

const normalizeCourse = (course) => {
  const provider = clampText(course.provider || course.sourceName, "External course provider", 140);
  const title = clampText(course.title, "Technology Course", 180);
  const externalUrl = canonicalUrl(course.url || course.externalUrl || "");
  const description = clampText(
    course.description || course.summary,
    `${title} is an external technology course from ${provider}. Enroll on the provider website to access the course content.`,
    760
  );
  const subtopics = inferSubtopics({ ...course, title, description });
  const externalId = `${course.externalId || hashValue(`${provider}:${externalUrl}:${title}`).slice(0, 18)}`;

  return {
    course_instructor: {
      instructorId: COURSE_OWNER.id,
      instructorName: provider,
      instructorTitle: course.instructorTitle || COURSE_OWNER.title,
      instructorAvatar: course.logo || COURSE_OWNER.avatar,
    },
    course_title: title,
    course_video_lectures: [],
    course_video_topics: subtopics.length ? subtopics : ["Technology"],
    course_logo: {
      logoLink: canonicalUrl(course.logo || course.image || ""),
      logoID: "",
    },
    course_description: description,
    course_category: {
      main: inferCategory({ ...course, title, description }),
      sub1: subtopics[0] || "",
      sub2: subtopics[1] || "",
      sub3: subtopics[2] || "",
      sub4: subtopics[3] || "",
    },
    course_edited: false,
    isDisabled: false,
    course_rate_count: normalizeRating(course),
    price: Number(course.price || 0),
    student_count: Number(course.studentCount || course.ratingCount || 0),
    externalCourse: true,
    externalUrl,
    externalProvider: provider,
    source: {
      name: course.sourceName,
      type: course.sourceType || "course-catalog",
      externalId,
      url: externalUrl,
      scrapedAt: new Date(),
    },
  };
};

const fetchJsonDocument = async (browser, url) => {
  const page = await browser.newPage();
  try {
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 MetatronCourseUpdater/1.0"
    );
    await page.setExtraHTTPHeaders({ "accept-language": "en-US,en;q=0.9" });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: REQUEST_TIMEOUT });
    const body = await page.evaluate(() => document.body.innerText);
    return JSON.parse(body);
  } finally {
    await page.close();
  }
};

const postGraphql = async (browser, url, query, variables = {}) => {
  const page = await browser.newPage();
  try {
    await page.goto("about:blank");
    return await page.evaluate(
      async ({ url, query, variables }) => {
        const response = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query, variables }),
        });
        return response.json();
      },
      { url, query, variables }
    );
  } finally {
    await page.close();
  }
};

const scrapePage = async (browser, url, evaluate) => {
  const page = await browser.newPage();
  try {
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 MetatronCourseUpdater/1.0"
    );
    await page.setExtraHTTPHeaders({ "accept-language": "en-US,en;q=0.9" });
    await page.goto(url, { waitUntil: "networkidle2", timeout: REQUEST_TIMEOUT });
    return await page.evaluate(evaluate);
  } finally {
    await page.close();
  }
};

const validateCourseUrl = async (browser, course) => {
  if (!course.externalUrl || !/^https?:\/\//i.test(course.externalUrl)) {
    return { ok: false, reason: "missing-url" };
  }

  const page = await browser.newPage();
  try {
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 MetatronCourseValidator/1.0"
    );
    await page.setExtraHTTPHeaders({ "accept-language": "en-US,en;q=0.9" });
    const response = await page.goto(course.externalUrl, {
      waitUntil: "domcontentloaded",
      timeout: REQUEST_TIMEOUT,
    });
    const status = response?.status?.() || 0;
    const title = cleanText(await page.title());
    const bodyStart = cleanText(await page.evaluate(() => document.body?.innerText?.slice(0, 800) || ""));
    const notFoundText = /\b(404|not found|requested url .* was not found|page not found|course not found)\b/i.test(`${title} ${bodyStart}`);

    if (status >= 400 || [0, 404, 410].includes(status) || notFoundText) {
      return { ok: false, reason: `bad-link:${status || "unknown"}` };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error.message || "validation-failed" };
  } finally {
    await page.close();
  }
};

const filterWorkingCourseLinks = async (browser, courses, concurrency = 4) => {
  const accepted = [];
  const rejected = [];
  let cursor = 0;

  const workers = Array.from({ length: Math.min(concurrency, courses.length) }, async () => {
    while (cursor < courses.length) {
      const current = courses[cursor];
      cursor += 1;
      const validation = await validateCourseUrl(browser, current);
      if (validation.ok) {
        accepted.push(current);
      } else {
        rejected.push({
          title: current.course_title,
          externalUrl: current.externalUrl,
          reason: validation.reason,
        });
      }
    }
  });

  await Promise.all(workers);
  return { accepted, rejected };
};

const courseAdapters = [
  {
    name: "Microsoft Learn",
    run: async (browser, perSourceLimit) => {
      const data = await fetchJsonDocument(browser, "https://learn.microsoft.com/api/catalog/?locale=en-us");
      const modules = [...(data.learningPaths || []), ...(data.modules || [])]
        .filter((item) => isTechCourse({ title: item.title, description: item.summary, tags: [...asArray(item.products), ...asArray(item.subjects), ...asArray(item.roles)] }))
        .sort((a, b) => (Number(b.popularity) || 0) - (Number(a.popularity) || 0))
        .slice(0, perSourceLimit);

      return modules.map((item) => ({
        sourceName: "Microsoft Learn",
        externalId: item.uid,
        title: item.title,
        provider: "Microsoft Learn",
        url: absoluteUrl(item.url || item.firstModuleUrl || item.firstUnitUrl, "https://learn.microsoft.com"),
        description: item.summary,
        tags: [...asArray(item.products), ...asArray(item.subjects), ...asArray(item.roles), ...asArray(item.levels)],
        ratingAverage: item.rating?.average,
        ratingCount: item.rating?.count,
        popularity: item.popularity,
        logo: item.social_image_url || item.icon_url,
        instructorTitle: `${item.type === "learningPath" ? "Learning Path" : "Module"} | ${item.duration_in_minutes || 0} minutes`,
      }));
    },
  },
  {
    name: "freeCodeCamp",
    run: async (browser, perSourceLimit) => {
      const result = await postGraphql(
        browser,
        "https://curriculum-db.freecodecamp.org/graphql",
        "{ curriculum { certifications superblocks } }"
      );
      const certifications = result?.data?.curriculum?.certifications || [];
      return certifications
        .filter((slug) => !/english|spanish|chinese|algebra/i.test(slug))
        .slice(0, perSourceLimit)
        .map((slug) => ({
          sourceName: "freeCodeCamp",
          externalId: slug,
          title: titleFromSlug(slug),
          provider: "freeCodeCamp",
          url: `https://www.freecodecamp.org/learn/${slug}/`,
          description: `${titleFromSlug(slug)} is a free, project-based developer curriculum from freeCodeCamp.`,
          tags: slug.split("-"),
          popularity: 0.95,
          logo: "https://design-style-guide.freecodecamp.org/downloads/fcc_primary_large.jpg",
          instructorTitle: "Free certification curriculum",
        }));
    },
  },
  {
    name: "Kaggle Learn",
    run: async (browser, perSourceLimit) => {
      const courses = await scrapePage(browser, "https://www.kaggle.com/learn", () =>
        [...document.querySelectorAll("a[href*='/learn/']")]
          .map((link) => {
            const title = link.querySelector("h2, h3, h4")?.textContent || link.textContent;
            const description =
              link.parentElement?.textContent?.replace(title || "", "").trim() ||
              link.closest("li, article, div")?.textContent?.replace(title || "", "").trim();
            return {
              title,
              description,
              url: link.href,
            };
          })
          .filter((item) => item.title && item.url)
      );

      return courses.slice(0, perSourceLimit).map((item, index) => ({
        sourceName: "Kaggle Learn",
        externalId: item.url,
        title: cleanText(item.title),
        provider: "Kaggle Learn",
        url: item.url,
        description: item.description,
        tags: ["data science", "machine learning", "python"],
        popularity: Math.max(0.6, 1 - index * 0.03),
        logo: "https://www.kaggle.com/static/images/site-logo.svg",
        instructorTitle: "Practical data science course",
      }));
    },
  },
  {
    name: "MIT FireRoad",
    run: async (browser, perSourceLimit) => {
      const searches = ["computer science", "machine learning", "software", "algorithms", "data science"];
      const results = await Promise.all(
        searches.map(async (search) => {
          try {
            const data = await fetchJsonDocument(browser, `https://fireroad.mit.edu/courses/search/${encodeURIComponent(search)}?full=true`);
            return data.map((item) => ({
              sourceName: "MIT FireRoad",
              sourceType: `mit-fireroad:${search}`,
              externalId: item.subject_id,
              title: `${item.subject_id} ${item.title}`,
              provider: "MIT",
              url: `https://fireroad.mit.edu/course/${encodeURIComponent(item.subject_id)}`,
              description: item.description,
              tags: [search, item.level, ...(item.related_subjects || [])].filter(Boolean),
              rating: item.rating,
              popularity: item.enrollment_number ? Math.min(1, Number(item.enrollment_number) / 500) : 0.7,
              logo: "https://ocw.mit.edu/static_shared/images/mit-ocw-logo.svg",
              instructorTitle: item.instructors?.length ? item.instructors.join(", ") : "MIT course catalog",
            }));
          } catch {
            return [];
          }
        })
      );

      return results.flat().sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0)).slice(0, perSourceLimit);
    },
  },
  {
    name: "GitHub Learning",
    run: async (browser, perSourceLimit) => {
      const courses = [
        {
          slug: "microsoft/generative-ai-for-beginners",
          title: "Generative AI for Beginners",
          description: "A Microsoft course covering generative AI concepts, prompt engineering, agents, RAG, and practical app patterns.",
          tags: ["AI", "Generative AI", "LLM", "Python"],
        },
        {
          slug: "microsoft/AI-For-Beginners",
          title: "AI for Beginners",
          description: "A Microsoft curriculum introducing artificial intelligence concepts, neural networks, computer vision, NLP, and ethics.",
          tags: ["AI", "Machine Learning", "Python"],
        },
        {
          slug: "microsoft/ML-For-Beginners",
          title: "Machine Learning for Beginners",
          description: "A Microsoft machine learning curriculum with practical lessons and projects.",
          tags: ["Machine Learning", "Data Science", "Python"],
        },
        {
          slug: "microsoft/Web-Dev-For-Beginners",
          title: "Web Development for Beginners",
          description: "A Microsoft curriculum for HTML, CSS, JavaScript, browser APIs, and web application foundations.",
          tags: ["Web", "JavaScript", "Frontend"],
        },
        {
          slug: "microsoft/Data-Science-For-Beginners",
          title: "Data Science for Beginners",
          description: "A Microsoft curriculum covering data science foundations, statistics, visualization, and machine learning workflows.",
          tags: ["Data Science", "Python", "Machine Learning"],
        },
      ];

      return courses.slice(0, perSourceLimit).map((course) => ({
        sourceName: "GitHub Learning",
        externalId: course.slug,
        title: course.title,
        provider: "Microsoft on GitHub",
        url: `https://github.com/${course.slug}`,
        description: course.description,
        tags: course.tags,
        popularity: 0.9,
        logo: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
        instructorTitle: "Open-source curriculum",
      }));
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

const collectCourses = async ({ browser, perSourceLimit }) => {
  const settled = await Promise.allSettled(
    courseAdapters.map(async (adapter) => {
      const courses = await adapter.run(browser, perSourceLimit);
      return {
        name: adapter.name,
        count: courses.length,
        courses,
      };
    })
  );

  const summary = settled.map((result, index) => {
    const adapter = courseAdapters[index];
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
    courses: settled
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value.courses),
  };
};

const dedupeCourses = (courses) => {
  const seen = new Set();
  const exactUnique = courses.filter((course) => {
    const key = course.externalUrl || canonicalRecordKey([course.course_title, course.externalProvider]);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return uniqueByCloseness(exactUnique, areCloseCourses);
};

const saveNewCourses = async (courses, dryRun = false) => {
  if (!courses.length) return { inserted: [], skipped: 0 };
  if (dryRun) return { inserted: [], skipped: 0, pending: courses.length };

  const or = courses.flatMap((course) => {
    const filters = [];
    if (course.externalUrl) filters.push({ externalUrl: course.externalUrl });
    if (course.source?.name && course.source?.externalId) {
      filters.push({
        "source.name": course.source.name,
        "source.externalId": course.source.externalId,
      });
    }
    return filters;
  });

  const existing = or.length
    ? await PostCourseModel.find({ $or: or }).select("externalUrl source.name source.externalId").lean()
    : [];

  const existingKeys = new Set(
    existing.flatMap((course) => [
      course.externalUrl,
      course.source?.name && course.source?.externalId ? `${course.source.name}:${course.source.externalId}` : "",
    ])
  );

  const exactNewCourses = courses.filter((course) => {
    const sourceKey = course.source?.name && course.source?.externalId ? `${course.source.name}:${course.source.externalId}` : "";
    return !existingKeys.has(course.externalUrl) && !existingKeys.has(sourceKey);
  });

  const existingComparableCourses = await PostCourseModel.find({})
    .sort({ createdAt: -1 })
    .limit(1800)
    .select("course_title course_instructor.instructorName course_category externalProvider externalUrl")
    .lean();

  const newCourses = exactNewCourses.filter(
    (course) => !existingComparableCourses.some((existingCourse) => areCloseCourses(existingCourse, course))
  );

  if (!newCourses.length) {
    return { inserted: [], skipped: courses.length - newCourses.length, pending: newCourses.length };
  }

  const inserted = await PostCourseModel.insertMany(newCourses, { ordered: false });
  return { inserted, skipped: courses.length - newCourses.length };
};

export const scrapeAndSaveExternalTechCourses = async ({ limit = DEFAULT_LIMIT, perSourceLimit = DEFAULT_PER_SOURCE_LIMIT, dryRun = false } = {}) => {
  const browser = await launchBrowser();
  try {
    const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), 240);
    const safePerSourceLimit = Math.min(Math.max(Number(perSourceLimit) || DEFAULT_PER_SOURCE_LIMIT, 1), 70);
    const candidateLimit = Math.min(safeLimit * 3, 240);
    const { courses, summary } = await collectCourses({ browser, perSourceLimit: safePerSourceLimit });
    const normalizedCandidates = dedupeCourses(
      courses
        .filter((course) => course.title && (course.url || course.externalUrl))
        .filter(isTechCourse)
        .map(normalizeCourse)
        .sort((a, b) => {
          const scoreB = (Number(b.course_rate_count) || 0) + Math.min(Number(b.student_count) || 0, 10000) / 10000;
          const scoreA = (Number(a.course_rate_count) || 0) + Math.min(Number(a.student_count) || 0, 10000) / 10000;
          return scoreB - scoreA;
        })
        .slice(0, candidateLimit)
    );
    const { accepted, rejected } = await filterWorkingCourseLinks(browser, normalizedCandidates);
    const normalized = await enrichCourseLogos(browser, accepted.slice(0, safeLimit));

    const saveResult = await saveNewCourses(normalized, dryRun);

    return {
      fetched: courses.length,
      structured: normalized.length,
      rejectedBrokenLinks: rejected.length,
      inserted: saveResult.inserted.length,
      skipped: saveResult.skipped,
      pending: saveResult.pending || 0,
      dryRun,
      sources: summary,
      rejected: dryRun ? rejected.slice(0, 20) : [],
      courses: (dryRun ? normalized.slice(0, 20) : saveResult.inserted).map((course) => ({
        _id: course._id,
        title: course.course_title,
        externalUrl: course.externalUrl,
        provider: course.externalProvider,
        logo: course.course_logo?.logoLink,
        source: course.source,
      })),
    };
  } finally {
    await browser.close();
  }
};
