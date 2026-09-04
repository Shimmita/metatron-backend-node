import AddEventModel from "../model/AddEventModel.js";
import ConversationModel from "../model/ConversationModel.js";
import JobPostModel from "../model/JobPostModel.js";
import MessageModel from "../model/MessageModel.js";
import PostCourseModel from "../model/PostCourseModel.js";
import TechPostModel from "../model/TechPostModel.js";
import personalModel from "../model/personalModel.js";

const ADMIN_ROLES = ["admin", "user"];
const JOB_STATUSES = ["active", "inactive"];

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildSearchFilter = (search, fields) => {
  const value = search?.trim();
  if (!value) return {};

  const regex = { $regex: escapeRegex(value), $options: "i" };
  return {
    $or: fields.map((field) => ({ [field]: regex })),
  };
};

const resourceConfig = {
  users: {
    model: personalModel,
    select: "-password",
    search: ["name", "email", "specialisationTitle", "country", "county", "role"],
    ownerId: (record) => record?._id,
  },
  posts: {
    model: TechPostModel,
    search: ["post_title", "post_body", "post_owner.ownername", "post_category.main"],
    ownerId: (record) => record?.post_owner?.ownerId,
  },
  jobs: {
    model: JobPostModel,
    search: ["title", "category", "organisation.name", "jobtypeaccess.type", "jobtypeaccess.access", "status"],
  },
  events: {
    model: AddEventModel,
    search: ["title", "about", "category", "ownerName", "location.country", "location.state"],
    ownerId: (record) => record?.ownerId,
  },
  courses: {
    model: PostCourseModel,
    search: ["course_title", "course_description", "course_instructor.instructorName", "course_category.main"],
    ownerId: (record) => record?.course_instructor?.instructorId,
  },
};

const getSupportEmail = () => process.env.DEV_EMAIL || process.env.BREVO_FROM || "technical support";

const getConfig = (resource) => {
  const config = resourceConfig[resource];
  if (!config) {
    throw new Error("unsupported admin resource");
  }
  return config;
};

const getResourceTitle = (resource, record) => {
  if (resource === "users") return record?.name || "your account";
  if (resource === "posts") return record?.post_title || "your post";
  if (resource === "events") return record?.title || "your event";
  if (resource === "courses") return record?.course_title || "your course";
  if (resource === "jobs") return record?.title || "your job";
  return "your content";
};

const sendAdminMessage = async ({ adminUser, targetUserId, content }) => {
  if (!targetUserId || !content?.trim()) return null;

  const targetUser = await personalModel.findById(targetUserId).select("name avatar").lean();
  if (!targetUser) return null;

  const adminId = `${adminUser._id}`;
  const userId = `${targetUserId}`;
  const participants = [adminId, userId];

  let conversation = await ConversationModel.findOne({
    participants: { $all: participants },
    adminThread: true,
  });

  if (!conversation) {
    conversation = await ConversationModel.create({
      participants,
      senderName: "Admin",
      senderAvatar: "",
      targetName: targetUser.name,
      targetAvatar: targetUser.avatar,
      lastMessage: content,
      lastSenderId: adminId,
      adminThread: true,
      adminUserId: adminId,
      userParticipantId: userId,
      isTargetRead: false,
      updatedAt: Date.now(),
    });
  }

  const message = await MessageModel.create({
    conversationId: conversation._id,
    senderId: adminId,
    content,
  });

  await ConversationModel.findByIdAndUpdate(conversation._id, {
    senderName: "Admin",
    senderAvatar: "",
    targetName: targetUser.name,
    targetAvatar: targetUser.avatar,
    lastMessage: content,
    lastSenderId: adminId,
    adminThread: true,
    adminUserId: adminId,
    userParticipantId: userId,
    isTargetRead: false,
    updatedAt: Date.now(),
  });

  return message;
};

export const handleAdminOnly = async (req, res, next) => {
  try {
    const userID = req.session?.userID;
    if (!userID) {
      return res.status(401).send({ message: "admin session required" });
    }

    const user = await personalModel.findById(userID).select("name email role").lean();
    if (!user || user.role !== "admin") {
      return res.status(403).send({ message: "admin access required" });
    }

    req.adminUser = user;
    next();
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
};

export const handleGetAdminOverview = async (req, res) => {
  try {
    const now = new Date();

    const [
      users,
      admins,
      disabledUsers,
      posts,
      disabledPosts,
      reportedPosts,
      jobs,
      activeJobs,
      events,
      disabledEvents,
      upcomingEvents,
      courses,
      disabledCourses,
      recentUsers,
      recentPosts,
      recentJobs,
      recentEvents,
      recentCourses,
    ] = await Promise.all([
      personalModel.countDocuments(),
      personalModel.countDocuments({ role: "admin" }),
      personalModel.countDocuments({ isDisabled: true }),
      TechPostModel.countDocuments(),
      TechPostModel.countDocuments({ isDisabled: true }),
      TechPostModel.countDocuments({ report_count: { $gt: 0 } }),
      JobPostModel.countDocuments(),
      JobPostModel.countDocuments({ status: "active" }),
      AddEventModel.countDocuments(),
      AddEventModel.countDocuments({ isDisabled: true }),
      AddEventModel.countDocuments({ dateHosted: { $gte: now } }),
      PostCourseModel.countDocuments(),
      PostCourseModel.countDocuments({ isDisabled: true }),
      personalModel.find().sort({ createdAt: -1 }).limit(5).select("name email role specialisationTitle avatar createdAt").lean(),
      TechPostModel.find().sort({ createdAt: -1 }).limit(5).select("post_title post_owner post_category report_count createdAt").lean(),
      JobPostModel.find().sort({ createdAt: -1 }).limit(5).select("title organisation status applicants createdAt").lean(),
      AddEventModel.find().sort({ createdAt: -1 }).limit(5).select("title ownerName category dateHosted users createdAt").lean(),
      PostCourseModel.find().sort({ createdAt: -1 }).limit(5).select("course_title course_instructor course_category student_count createdAt").lean(),
    ]);

    res.status(200).send({
      totals: {
        users,
        admins,
        standardUsers: Math.max(users - admins, 0),
        disabledUsers,
        posts,
        disabledPosts,
        reportedPosts,
        jobs,
        activeJobs,
        inactiveJobs: Math.max(jobs - activeJobs, 0),
        events,
        disabledEvents,
        upcomingEvents,
        pastEvents: Math.max(events - upcomingEvents, 0),
        courses,
        disabledCourses,
      },
      recent: {
        users: recentUsers,
        posts: recentPosts,
        jobs: recentJobs,
        events: recentEvents,
        courses: recentCourses,
      },
    });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
};

export const handleGetAdminResource = async (req, res) => {
  try {
    const { resource } = req.params;
    const { search } = req.query;
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 60, 120);
    const skip = (page - 1) * limit;
    const config = getConfig(resource);
    const filter = buildSearchFilter(search, config.search);

    const query = config.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
    if (config.select) query.select(config.select);

    const [records, total] = await Promise.all([
      query.lean(),
      config.model.countDocuments(filter),
    ]);

    res.status(200).send({
      resource,
      total,
      page,
      limit,
      pages: Math.max(Math.ceil(total / limit), 1),
      records,
    });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
};

export const handleToggleAdminResourceDisabled = async (req, res) => {
  try {
    const { resource, id } = req.params;
    const { disabled = true, reason = "", notify = true } = req.body || {};

    if (!["users", "posts", "events", "courses"].includes(resource)) {
      return res.status(400).send({ message: "only users, posts, events and courses support disable actions" });
    }

    if (resource === "users" && `${req.session?.userID}` === `${id}` && disabled) {
      return res.status(400).send({ message: "you cannot disable your own admin account" });
    }

    const config = getConfig(resource);
    const updated = await config.model.findByIdAndUpdate(
      id,
      {
        isDisabled: Boolean(disabled),
        disabledReason: disabled ? reason : "",
        disabledBy: disabled ? `${req.adminUser?._id}` : "",
        disabledAt: disabled ? new Date() : null,
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).send({ message: "record not found" });
    }

    if (notify && disabled) {
      const ownerId = config.ownerId?.(updated);
      const resourceName = resource === "users" ? "account" : resource.slice(0, -1);
      const title = getResourceTitle(resource, updated);
      const supportEmail = getSupportEmail();
      const bodyReason = reason?.trim() ? ` Reason: ${reason.trim()}.` : "";
      await sendAdminMessage({
        adminUser: req.adminUser,
        targetUserId: ownerId,
        content: `Admin notice: your Metatron ${resourceName} "${title}" has been disabled.${bodyReason} Please contact technical help at ${supportEmail}.`,
      });
    }

    res.status(200).send(updated);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
};

export const handleSendAdminMessage = async (req, res) => {
  try {
    const { targetUserId, content } = req.body || {};

    if (!targetUserId) {
      return res.status(400).send({ message: "target user is required" });
    }
    if (!content?.trim()) {
      return res.status(400).send({ message: "message content is required" });
    }

    const message = await sendAdminMessage({
      adminUser: req.adminUser,
      targetUserId,
      content: content.trim(),
    });

    if (!message) {
      return res.status(404).send({ message: "target user not found" });
    }

    res.status(200).send({ message: "admin message sent", data: message });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
};

export const handleUpdateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body || {};

    if (!ADMIN_ROLES.includes(role)) {
      return res.status(400).send({ message: "role must be admin or user" });
    }

    if (`${req.session?.userID}` === `${userId}` && role !== "admin") {
      return res.status(400).send({ message: "you cannot remove your own admin access" });
    }

    const user = await personalModel.findByIdAndUpdate(
      userId,
      { role },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).send({ message: "user not found" });
    }

    res.status(200).send(user);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
};

export const handleUpdateJobStatusAdmin = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { status } = req.body || {};

    if (!JOB_STATUSES.includes(status)) {
      return res.status(400).send({ message: "job status must be active or inactive" });
    }

    const job = await JobPostModel.findByIdAndUpdate(
      jobId,
      { status },
      { new: true, runValidators: true }
    );

    if (!job) {
      return res.status(404).send({ message: "job not found" });
    }

    res.status(200).send(job);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
};

export const handleDeleteAdminResource = async (req, res) => {
  try {
    const { resource, id } = req.params;

    if (resource === "users" && `${req.session?.userID}` === `${id}`) {
      return res.status(400).send({ message: "you cannot delete your own admin account" });
    }

    const config = getConfig(resource);
    const deleted = await config.model.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).send({ message: "record not found" });
    }

    res.status(200).send({ message: `${resource} record deleted`, id });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
};
