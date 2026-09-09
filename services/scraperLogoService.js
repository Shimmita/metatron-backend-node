import puppeteer from "puppeteer";
import AddEventModel from "../model/AddEventModel.js";
import JobPostModel from "../model/JobPostModel.js";
import PostCourseModel from "../model/PostCourseModel.js";

export const METATRON_LOGO_TOKEN = "Metatron";

const LOGO_TIMEOUT = 12000;
const BACKFILL_LIMIT = 75;

const SKILL_LOGO_ALIASES = [
  ["JavaScript", ["javascript", "typescript", "js", "ts", "web development", "frontend", "front end"]],
  ["React", ["react", "next.js", "nextjs", "react native"]],
  ["Node", ["node", "node.js", "express", "backend", "back end", "api"]],
  ["Python", ["python", "django", "flask", "fastapi"]],
  ["Java", ["java", "spring", "spring boot"]],
  ["Go", ["go", "golang"]],
  ["Rust", ["rust"]],
  ["Ruby", ["ruby", "rails", "ruby on rails"]],
  ["PHP", ["php", "laravel"]],
  ["C#", ["c#", ".net", "dotnet"]],
  ["C++", ["c++", "cpp"]],
  ["AWS", ["aws", "amazon web services"]],
  ["Azure", ["azure", "microsoft azure"]],
  ["GCP", ["gcp", "google cloud"]],
  ["Docker", ["docker", "container", "containers", "containerisation"]],
  ["Kubernetes", ["kubernetes", "k8s"]],
  ["Terraform", ["terraform"]],
  ["Linux", ["linux"]],
  ["Cybersecurity", ["cyber", "security", "infosec", "privacy"]],
  ["Data Science", ["data science", "data engineering", "data analysis", "analytics", "sql", "database"]],
  ["AI", ["ai", "artificial intelligence", "machine learning", "ml", "llm", "generative ai", "genai"]],
  ["UI/UX", ["ui/ux", "ux", "design", "product design"]],
  ["Product Management", ["product manager", "product management", "product"]],
  ["Flutter", ["flutter", "dart"]],
  ["Kotlin", ["kotlin", "android"]],
  ["Swift", ["swift", "ios"]],
  ["GraphQL", ["graphql"]],
  ["MongoDB", ["mongodb", "mongo"]],
  ["PostgreSQL", ["postgresql", "postgres"]],
  ["MySQL", ["mysql"]],
  ["DevOps", ["devops", "ci/cd", "sre", "site reliability", "platform engineer", "platform"]],
  ["Coding", ["software", "developer", "engineering", "programming", "course", "technology", "tech"]],
];

const isHttpUrl = (value = "") => /^https?:\/\//i.test(`${value || ""}`.trim());

const asArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(/[,|;/]/);
  return [];
};

const cleanText = (value = "") => `${value || ""}`.replace(/\s+/g, " ").trim();

const absoluteUrl = (value = "", base = "") => {
  try {
    return new URL(value, base || undefined).toString();
  } catch {
    return cleanText(value);
  }
};

const canonicalAsset = (value = "", base = "") => {
  const cleaned = cleanText(value);
  if (!cleaned) return "";
  if (/^data:image\//i.test(cleaned)) return cleaned;
  return isHttpUrl(cleaned) || cleaned.startsWith("//")
    ? absoluteUrl(cleaned, base || "https:")
    : cleaned;
};

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOGO_TIMEOUT);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

export const isWorkingImageUrl = async (value = "") => {
  const url = canonicalAsset(value);
  if (!isHttpUrl(url)) return false;

  const isImageResponse = (response) => {
    const contentType = response.headers?.get?.("content-type") || "";
    return response.ok && (!contentType || /^image\//i.test(contentType));
  };

  try {
    const head = await fetchWithTimeout(url, { method: "HEAD", redirect: "follow" });
    if (isImageResponse(head)) return true;
  } catch {
    // Some providers block HEAD; the GET probe below catches those.
  }

  try {
    const response = await fetchWithTimeout(url, {
      method: "GET",
      redirect: "follow",
      headers: { range: "bytes=0-2048" },
    });
    return isImageResponse(response);
  } catch {
    return false;
  }
};

export const resolveSkillLogoToken = (skills = []) => {
  const values = asArray(skills)
    .map(cleanText)
    .filter(Boolean);
  const exactValues = values.map((value) => value.toLowerCase());
  const text = exactValues.join(" ");

  if (!text) return "";

  const exact = SKILL_LOGO_ALIASES.find(([token]) => exactValues.some((item) => item === token.toLowerCase()));
  if (exact) return exact[0];

  const match = SKILL_LOGO_ALIASES.find(([, aliases]) =>
    aliases.some((alias) => new RegExp(`(^|[^a-z0-9+#.])${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9+#.]|$)`, "i").test(text))
  );
  return match?.[0] || "";
};

const extractLogoCandidates = async (browser, pageUrl = "") => {
  if (!browser || !isHttpUrl(pageUrl)) return [];

  const page = await browser.newPage();
  try {
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 MetatronLogoResolver/1.0"
    );
    await page.setExtraHTTPHeaders({ "accept-language": "en-US,en;q=0.9" });
    await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: LOGO_TIMEOUT });

    return await page.evaluate(() => {
      const values = [];
      const push = (value) => {
        if (value && !values.includes(value)) values.push(value);
      };

      [
        "meta[property='og:logo']",
        "meta[name='og:logo']",
        "meta[property='og:image']",
        "meta[name='twitter:image']",
        "meta[property='twitter:image']",
      ].forEach((selector) => push(document.querySelector(selector)?.content));

      [
        "link[rel='apple-touch-icon']",
        "link[rel='apple-touch-icon-precomposed']",
        "link[rel='icon']",
        "link[rel='shortcut icon']",
        "link[rel='mask-icon']",
      ].forEach((selector) => push(document.querySelector(selector)?.href));

      [
        "[itemprop='logo']",
        "img[alt*='logo' i]",
        "img[class*='logo' i]",
        "img[src*='logo' i]",
        "header img",
        "nav img",
      ].forEach((selector) => {
        document.querySelectorAll(selector).forEach((node) => {
          push(node.currentSrc || node.src || node.getAttribute("content"));
        });
      });

      return values;
    });
  } catch {
    return [];
  } finally {
    await page.close();
  }
};

export const resolveScrapedLogo = async ({
  browser,
  logo,
  pageUrl,
  skills = [],
  fallbackText = [],
} = {}) => {
  const knownLogo = canonicalAsset(logo, pageUrl);
  if (isHttpUrl(knownLogo) && (await isWorkingImageUrl(knownLogo))) return knownLogo;

  const candidates = await extractLogoCandidates(browser, pageUrl);
  for (const candidate of candidates.map((value) => canonicalAsset(value, pageUrl)).filter(isHttpUrl)) {
    if (await isWorkingImageUrl(candidate)) return candidate;
  }

  return resolveSkillLogoToken([...asArray(skills), ...asArray(fallbackText), knownLogo]) || METATRON_LOGO_TOKEN;
};

const mapConcurrent = async (items, mapper, concurrency = 5) => {
  const results = new Array(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
};

export const enrichJobLogos = (browser, jobs = []) =>
  mapConcurrent(jobs, async (job) => ({
    ...job,
    logo: await resolveScrapedLogo({
      browser,
      logo: job.logo,
      pageUrl: job.website || job.source?.url,
      skills: job.skills,
      fallbackText: [job.title, job.category, job.organisation?.name],
    }),
  }));

export const enrichEventLogos = (browser, events = []) =>
  mapConcurrent(events, async (event) => ({
    ...event,
    ownerAvatar: await resolveScrapedLogo({
      browser,
      logo: event.ownerAvatar,
      pageUrl: event.hostWebsite || event.hostLink || event.source?.url,
      skills: [...asArray(event.skills), ...asArray(event.topics)],
      fallbackText: [event.title, event.category, event.ownerName],
    }),
  }));

export const enrichCourseLogos = (browser, courses = []) =>
  mapConcurrent(courses, async (course) => {
    const logo = await resolveScrapedLogo({
      browser,
      logo: course.course_logo?.logoLink || course.course_instructor?.instructorAvatar,
      pageUrl: course.externalUrl || course.source?.url,
      skills: [
        ...asArray(course.course_video_topics),
        course.course_category?.main,
        course.course_category?.sub1,
        course.course_category?.sub2,
      ],
      fallbackText: [course.course_title, course.externalProvider],
    });

    return {
      ...course,
      course_logo: { ...(course.course_logo || {}), logoLink: logo },
      course_instructor: { ...(course.course_instructor || {}), instructorAvatar: logo },
    };
  });

const launchLogoBrowser = () => {
  const launchOptions = {
    headless: "new",
    args: ["--disable-dev-shm-usage", "--disable-gpu", "--no-sandbox", "--disable-setuid-sandbox"],
  };

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  return puppeteer.launch(launchOptions);
};

export const backfillExternalScrapedLogos = async ({ browser, limit = BACKFILL_LIMIT } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || BACKFILL_LIMIT, 1), 300);
  const activeBrowser = browser || (await launchLogoBrowser());
  const ownsBrowser = !browser;

  try {
    const [jobs, events, courses] = await Promise.all([
      JobPostModel.find({ "source.name": { $exists: true, $ne: "" } })
        .sort({ updatedAt: -1 })
        .limit(safeLimit)
        .select("logo website source title category organisation.name skills")
        .lean(),
      AddEventModel.find({ externalEvent: true })
        .sort({ updatedAt: -1 })
        .limit(safeLimit)
        .select("ownerAvatar hostWebsite hostLink source title category ownerName skills topics")
        .lean(),
      PostCourseModel.find({ externalCourse: true })
        .sort({ updatedAt: -1 })
        .limit(safeLimit)
        .select("course_logo course_instructor externalUrl source course_title externalProvider course_video_topics course_category")
        .lean(),
    ]);

    const [jobUpdates, eventUpdates, courseUpdates] = await Promise.all([
      enrichJobLogos(activeBrowser, jobs),
      enrichEventLogos(activeBrowser, events),
      enrichCourseLogos(activeBrowser, courses),
    ]);

    const changedJobs = jobUpdates.filter((job, index) => job.logo && job.logo !== jobs[index]?.logo);
    const changedEvents = eventUpdates.filter((event, index) => event.ownerAvatar && event.ownerAvatar !== events[index]?.ownerAvatar);
    const changedCourses = courseUpdates.filter(
      (course, index) =>
        course.course_logo?.logoLink &&
        course.course_logo.logoLink !== courses[index]?.course_logo?.logoLink
    );

    await Promise.all([
      ...changedJobs.map((job) => JobPostModel.updateOne({ _id: job._id }, { $set: { logo: job.logo } })),
      ...changedEvents.map((event) => AddEventModel.updateOne({ _id: event._id }, { $set: { ownerAvatar: event.ownerAvatar } })),
      ...changedCourses.map((course) =>
        PostCourseModel.updateOne(
          { _id: course._id },
          {
            $set: {
              "course_logo.logoLink": course.course_logo.logoLink,
              "course_instructor.instructorAvatar": course.course_instructor.instructorAvatar,
            },
          }
        )
      ),
    ]);

    return {
      scanned: {
        jobs: jobs.length,
        events: events.length,
        courses: courses.length,
      },
      updated: {
        jobs: changedJobs.length,
        events: changedEvents.length,
        courses: changedCourses.length,
      },
    };
  } finally {
    if (ownsBrowser) await activeBrowser.close();
  }
};
