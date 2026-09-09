import puppeteer from "puppeteer";
import AddEventModel from "../model/AddEventModel.js";
import ConversationModel from "../model/ConversationModel.js";
import CourseEnrollmentModel from "../model/CourseEnrollmentModel.js";
import EventsRSVPModel from "../model/EventsRSVPModel.js";
import JobsAppliedModel from "../model/JobsAppliedModel.js";
import JobPostModel from "../model/JobPostModel.js";
import MessageModel from "../model/MessageModel.js";
import PostCourseModel from "../model/PostCourseModel.js";
import personalModel from "../model/personalModel.js";

const DEFAULT_LIMIT_PER_MODEL = 80;
const REQUEST_TIMEOUT = 24000;
const DAY_MS = 24 * 60 * 60 * 1000;

const DEFINITIVE_TEXT_PATTERNS = {
  job: /\b(job not found|position not found|job has expired|position has expired|job is no longer available|position is no longer available|opening is closed|position closed|this job is closed|no longer accepting applications|has been filled)\b/i,
  event: /\b(event not found|event has expired|event is no longer available|event ended|registration closed|this event is closed|cancelled|canceled)\b/i,
  course: /\b(course not found|requested url .* was not found|course no longer available|course is no longer available|page not found|not found)\b/i,
};

const cleanText = (value = "") => `${value || ""}`.replace(/\s+/g, " ").trim();
const isHttpUrl = (value = "") => /^https?:\/\//i.test(cleanText(value));
const isObjectIdLike = (value = "") => /^[a-f\d]{24}$/i.test(`${value || ""}`);

const launchBrowser = () => {
  const launchOptions = {
    headless: "new",
    args: ["--disable-dev-shm-usage", "--disable-gpu", "--no-sandbox", "--disable-setuid-sandbox"],
  };

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  return puppeteer.launch(launchOptions);
};

const checkExternalUrlAvailability = async ({ browser, url, kind, eventDate }) => {
  const checkedAt = new Date();
  const checkedUrl = cleanText(url);

  if (kind === "event" && eventDate) {
    const date = new Date(eventDate);
    if (!Number.isNaN(date.getTime()) && date.getTime() < Date.now() - DAY_MS) {
      return {
        status: "expired",
        reason: "event date has passed",
        checkedAt,
        checkedUrl,
        statusCode: 0,
      };
    }
  }

  if (!isHttpUrl(checkedUrl)) {
    return {
      status: "expired",
      reason: "missing or invalid external URL",
      checkedAt,
      checkedUrl,
      statusCode: 0,
    };
  }

  const page = await browser.newPage();
  try {
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 MetatronAvailabilityCleaner/1.0"
    );
    await page.setExtraHTTPHeaders({ "accept-language": "en-US,en;q=0.9" });
    const response = await page.goto(checkedUrl, {
      waitUntil: "domcontentloaded",
      timeout: REQUEST_TIMEOUT,
    });
    const statusCode = response?.status?.() || 0;
    const title = cleanText(await page.title());
    const body = cleanText(await page.evaluate(() => document.body?.innerText?.slice(0, 2200) || ""));
    const haystack = `${title} ${body}`;

    if ([404, 410].includes(statusCode)) {
      return {
        status: "expired",
        reason: `external ${kind} returned ${statusCode}`,
        checkedAt,
        checkedUrl,
        statusCode,
      };
    }

    if (DEFINITIVE_TEXT_PATTERNS[kind].test(haystack)) {
      return {
        status: "expired",
        reason: `external ${kind} page says it is unavailable`,
        checkedAt,
        checkedUrl,
        statusCode,
      };
    }

    if ([401, 403, 408, 425, 429].includes(statusCode) || statusCode >= 500) {
      return {
        status: "unknown",
        reason: `temporary or protected response ${statusCode || "unknown"}`,
        checkedAt,
        checkedUrl,
        statusCode,
      };
    }

    return {
      status: "available",
      reason: "",
      checkedAt,
      checkedUrl,
      statusCode,
    };
  } catch (error) {
    return {
      status: "unknown",
      reason: error.message || "availability check failed",
      checkedAt,
      checkedUrl,
      statusCode: 0,
    };
  } finally {
    await page.close();
  }
};

const mapConcurrent = async (items, mapper, concurrency = 4) => {
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

const getAutomationSender = async () => {
  const admin = await personalModel
    .findOne({ role: "admin", isDisabled: { $ne: true } })
    .sort({ createdAt: 1 })
    .select("_id name avatar")
    .lean();

  return admin || null;
};

const sendSystemNoticeToUsers = async ({ sender, userIds = [], content }) => {
  if (!sender || !content) return { sent: 0, skipped: userIds.length };

  const uniqueIds = [...new Set(userIds.map((id) => `${id || ""}`).filter(isObjectIdLike))];
  if (!uniqueIds.length) return { sent: 0, skipped: userIds.length };

  const users = await personalModel
    .find({ _id: { $in: uniqueIds }, isDisabled: { $ne: true } })
    .select("_id name avatar")
    .lean();

  let sent = 0;
  const senderId = `${sender._id}`;

  for (const user of users) {
    const userId = `${user._id}`;
    const participants = [senderId, userId];
    let conversation = await ConversationModel.findOne({
      participants: { $all: participants },
      adminThread: true,
    });

    if (!conversation) {
      conversation = await ConversationModel.create({
        participants,
        senderName: "Metatron Maintenance",
        senderAvatar: sender.avatar || "",
        targetName: user.name,
        targetAvatar: user.avatar,
        lastMessage: content,
        lastSenderId: senderId,
        adminThread: true,
        adminUserId: senderId,
        userParticipantId: userId,
        isTargetRead: false,
        updatedAt: Date.now(),
      });
    }

    await MessageModel.create({
      conversationId: conversation._id,
      senderId,
      content,
    });

    await ConversationModel.findByIdAndUpdate(conversation._id, {
      senderName: "Metatron Maintenance",
      senderAvatar: sender.avatar || "",
      targetName: user.name,
      targetAvatar: user.avatar,
      lastMessage: content,
      lastSenderId: senderId,
      adminThread: true,
      adminUserId: senderId,
      userParticipantId: userId,
      isTargetRead: false,
      updatedAt: Date.now(),
    });

    sent += 1;
  }

  return { sent, skipped: uniqueIds.length - sent };
};

const expireJob = async ({ job, availability, sender }) => {
  const applications = await JobsAppliedModel.find({ jobID: `${job._id}` }).select("applicant.applicantID").lean();
  const owner = job.my_email
    ? await personalModel.findOne({ email: job.my_email }).select("_id").lean()
    : null;
  const userIds = [
    owner?._id,
    ...applications.map((application) => application.applicant?.applicantID),
  ];

  await JobPostModel.updateOne(
    { _id: job._id },
    {
      $set: {
        status: "inactive",
        isDisabled: true,
        disabledBy: "system-expiry-cleanup",
        disabledAt: availability.checkedAt,
        disabledReason: `Job expired: ${availability.reason}`,
        expiredAt: availability.checkedAt,
        expiredReason: availability.reason,
        externalAvailability: availability,
      },
    }
  );

  const notification = await sendSystemNoticeToUsers({
    sender,
    userIds,
    content: `Job expired: "${job.title}" from ${job.organisation?.name || "the hiring team"} is no longer available on the external site. Your application history remains on Metatron, but the role has been removed from active listings.`,
  });

  return { notified: notification.sent, affectedUsers: [...new Set(userIds.map((id) => `${id || ""}`).filter(Boolean))].length };
};

const expireEvent = async ({ event, availability, sender }) => {
  const rsvps = await EventsRSVPModel.find({ eventId: `${event._id}` }).select("userId").lean();
  const ownerId = isObjectIdLike(event.ownerId) ? event.ownerId : "";
  const userIds = [ownerId, ...rsvps.map((rsvp) => rsvp.userId)];

  await AddEventModel.updateOne(
    { _id: event._id },
    {
      $set: {
        isDisabled: true,
        disabledBy: "system-expiry-cleanup",
        disabledAt: availability.checkedAt,
        disabledReason: `Event expired: ${availability.reason}`,
        expiredAt: availability.checkedAt,
        expiredReason: availability.reason,
        externalAvailability: availability,
      },
    }
  );

  const notification = await sendSystemNoticeToUsers({
    sender,
    userIds,
    content: `Event expired: "${event.title}" is no longer available or has passed. Your RSVP has been preserved for history, but the event is no longer shown as active on Metatron.`,
  });

  return { notified: notification.sent, affectedUsers: [...new Set(userIds.map((id) => `${id || ""}`).filter(Boolean))].length };
};

const expireCourse = async ({ course, availability, sender }) => {
  const enrollments = await CourseEnrollmentModel.find({ courseId: `${course._id}` }).select("userId").lean();
  const ownerId = isObjectIdLike(course.course_instructor?.instructorId) ? course.course_instructor.instructorId : "";
  const userIds = [ownerId, ...enrollments.map((enrollment) => enrollment.userId)];

  await PostCourseModel.updateOne(
    { _id: course._id },
    {
      $set: {
        isDisabled: true,
        disabledBy: "system-expiry-cleanup",
        disabledAt: availability.checkedAt,
        disabledReason: `Course expired: ${availability.reason}`,
        expiredAt: availability.checkedAt,
        expiredReason: availability.reason,
        externalAvailability: availability,
      },
    }
  );

  const notification = await sendSystemNoticeToUsers({
    sender,
    userIds,
    content: `Course no longer available: "${course.course_title}" from ${course.externalProvider || course.course_instructor?.instructorName || "the provider"} could not be verified on the external site. It has been removed from active course listings on Metatron.`,
  });

  return { notified: notification.sent, affectedUsers: [...new Set(userIds.map((id) => `${id || ""}`).filter(Boolean))].length };
};

const updateAvailability = async ({ model, id, availability }) => {
  await model.updateOne(
    { _id: id },
    {
      $set: {
        externalAvailability: availability,
      },
    }
  );
};

export const cleanupExpiredExternalResources = async ({
  limitPerModel = DEFAULT_LIMIT_PER_MODEL,
  dryRun = false,
} = {}) => {
  const safeLimit = Math.min(Math.max(Number(limitPerModel) || DEFAULT_LIMIT_PER_MODEL, 1), 250);
  const browser = await launchBrowser();
  const sender = dryRun ? null : await getAutomationSender();

  const summary = {
    scanned: { jobs: 0, events: 0, courses: 0 },
    expired: { jobs: 0, events: 0, courses: 0 },
    unknown: { jobs: 0, events: 0, courses: 0 },
    available: { jobs: 0, events: 0, courses: 0 },
    notified: { jobs: 0, events: 0, courses: 0 },
    affectedUsers: { jobs: 0, events: 0, courses: 0 },
    dryRun,
  };

  try {
    const notExpired = { $ne: "expired" };
    const [jobs, events, courses] = await Promise.all([
      JobPostModel.find({
        isDisabled: { $ne: true },
        "source.name": { $exists: true, $ne: "" },
        website: /^https?:\/\//i,
        "externalAvailability.status": notExpired,
      })
        .sort({ "externalAvailability.checkedAt": 1, createdAt: 1 })
        .limit(safeLimit)
        .select("title organisation.name website my_email source")
        .lean(),
      AddEventModel.find({
        isDisabled: { $ne: true },
        externalEvent: true,
        hostLink: /^https?:\/\//i,
        "externalAvailability.status": notExpired,
      })
        .sort({ dateHosted: 1, "externalAvailability.checkedAt": 1 })
        .limit(safeLimit)
        .select("title hostLink hostWebsite dateHosted ownerId source")
        .lean(),
      PostCourseModel.find({
        isDisabled: { $ne: true },
        externalCourse: true,
        externalUrl: /^https?:\/\//i,
        "externalAvailability.status": notExpired,
      })
        .sort({ "externalAvailability.checkedAt": 1, createdAt: 1 })
        .limit(safeLimit)
        .select("course_title externalUrl externalProvider course_instructor source")
        .lean(),
    ]);

    summary.scanned = { jobs: jobs.length, events: events.length, courses: courses.length };

    const jobResults = await mapConcurrent(jobs, async (job) => {
      const availability = await checkExternalUrlAvailability({ browser, url: job.website || job.source?.url, kind: "job" });
      if (availability.status === "expired") {
        summary.expired.jobs += 1;
        if (dryRun) return { availability };
        const result = await expireJob({ job, availability, sender });
        summary.notified.jobs += result.notified;
        summary.affectedUsers.jobs += result.affectedUsers;
        return { availability, result };
      }
      summary[availability.status].jobs += 1;
      if (!dryRun) await updateAvailability({ model: JobPostModel, id: job._id, availability });
      return { availability };
    });

    const eventResults = await mapConcurrent(events, async (event) => {
      const availability = await checkExternalUrlAvailability({
        browser,
        url: event.hostLink || event.hostWebsite || event.source?.url,
        kind: "event",
        eventDate: event.dateHosted,
      });
      if (availability.status === "expired") {
        summary.expired.events += 1;
        if (dryRun) return { availability };
        const result = await expireEvent({ event, availability, sender });
        summary.notified.events += result.notified;
        summary.affectedUsers.events += result.affectedUsers;
        return { availability, result };
      }
      summary[availability.status].events += 1;
      if (!dryRun) await updateAvailability({ model: AddEventModel, id: event._id, availability });
      return { availability };
    });

    const courseResults = await mapConcurrent(courses, async (course) => {
      const availability = await checkExternalUrlAvailability({ browser, url: course.externalUrl || course.source?.url, kind: "course" });
      if (availability.status === "expired") {
        summary.expired.courses += 1;
        if (dryRun) return { availability };
        const result = await expireCourse({ course, availability, sender });
        summary.notified.courses += result.notified;
        summary.affectedUsers.courses += result.affectedUsers;
        return { availability, result };
      }
      summary[availability.status].courses += 1;
      if (!dryRun) await updateAvailability({ model: PostCourseModel, id: course._id, availability });
      return { availability };
    });

    return {
      ...summary,
      checked: {
        jobs: jobResults.length,
        events: eventResults.length,
        courses: courseResults.length,
      },
      notificationSenderAvailable: Boolean(sender),
    };
  } finally {
    await browser.close();
  }
};
