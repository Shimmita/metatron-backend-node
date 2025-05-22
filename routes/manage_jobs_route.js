import express from "express";
import multer from "multer";

import {
  handleCreateJob,
  handleDeleteJobPost,
  handleGetAllJobs,
  handleGetAllJobsHiring,
  handleGetAllJobsSearch,
  handleGetJobApplicantsHiring,
  handleGetMyJobApplications,
  handleGetMyJobStats,
  handleGetNearbyJobs,
  handleGetRecommended,
  handleGetSpecificJobPost,
  handleGetTopJobs,
  handleGetVerifiedJobs,
  handleJobApplication,
} from "../controllers/manage_jobs_controller.js";
// set up multer for file uploads cloudinary
const uploadMulter = multer({ storage: multer.memoryStorage() });

export const manageJobsRouter = express.Router();

// JOB-SEEKER

// apply for new job from the posted
manageJobsRouter.post(
  "/application/apply",
  uploadMulter.single("file"),
  handleJobApplication
);

// handle searching of the jobs
manageJobsRouter.post("/all/search/:userId", handleGetAllJobsSearch);

// handle getting of the top Jobs the latest 3 from the database
manageJobsRouter.get("/all/top/:userId", handleGetTopJobs);

// get nearby jobs
manageJobsRouter.post("/all/nearby/:userId", handleGetNearbyJobs);

// get recommended jobs
manageJobsRouter.post("/all/recommended/:userId", handleGetRecommended);

// get user job applications 
manageJobsRouter.get("/all/my/application/:userId", handleGetMyJobApplications);

// get user job statistics 
manageJobsRouter.get("/all/my/statistics/:userId", handleGetMyJobStats);

// get all jobs 
manageJobsRouter.get("/all/:userId", handleGetAllJobs);

// get verified jobs
manageJobsRouter.get("/all/verified/:userId", handleGetVerifiedJobs);

// get specific job
manageJobsRouter.get("/all/:id", handleGetSpecificJobPost);

// delete job post
manageJobsRouter.delete("/delete/:id", handleDeleteJobPost);

// HIRING MANAGER

//create jobs route
manageJobsRouter.post("/create", uploadMulter.single("image"), handleCreateJob);

// get all posted jobs  by the hirer using their email as iD
manageJobsRouter.get("/all/hiring/posted/:emailId", handleGetAllJobsHiring);

// get all job applicants of a specific hr email and jobId
manageJobsRouter.get("/all/hiring/applicants/:emailId/:jobId", handleGetJobApplicantsHiring);


