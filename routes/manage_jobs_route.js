import express from "express";
import multer from "multer";

import {
  handleCreateJob,
  handleDeleteJobFeedBack,
  handleDeleteJobPostHiring,
  handleDeleteMyJobApplication,
  handleDownloadDocumentHiring,
  handleGetAllJobFeedBack,
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
  handleUpdateEntireJobHiring,
  handleUpdateJobApplicationStatusHiring,
  handleUpdateJobStatusHiring
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

// getting of job feedback
manageJobsRouter.get("/all/feedback/:userId", handleGetAllJobFeedBack);

// delete a job feedback
manageJobsRouter.delete("/all/feedback/:feedId", handleDeleteJobFeedBack);


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

// HIRING MANAGER

//create jobs route
manageJobsRouter.post("/create", uploadMulter.single("image"), handleCreateJob);

// get all posted jobs  by the hirer using their email as iD
manageJobsRouter.get("/all/hiring/posted/:emailId", handleGetAllJobsHiring);

// get all job applicants of a specific hr email and jobId
manageJobsRouter.get("/all/hiring/applicants/:emailId/:jobId", handleGetJobApplicantsHiring);

// updating the status of the job applicant by the hiring manager
manageJobsRouter.put("/all/hiring/application/status/:emailId/:jobId", handleUpdateJobApplicationStatusHiring);

// updating the status of job posted [active or inactive]
manageJobsRouter.put("/all/hiring/job/status/:emailId/:jobId", handleUpdateJobStatusHiring);

// updating the entire job post
manageJobsRouter.put("/all/hiring/job/update/:emailId/:jobId", handleUpdateEntireJobHiring);

// hr deleting a job they posted
manageJobsRouter.delete("/all/hiring/job/delete/:emailId/:jobId", handleDeleteJobPostHiring);


// USABLE TO ANY BOTH APPLICANT AND HR

// download the cv of the user, it will create a signedURL and sent to the frontend
manageJobsRouter.post("/all/download/cv/:emailId/:jobId", handleDownloadDocumentHiring);

// user deletes their job application, must purge the uploaded documents in the cloud
manageJobsRouter.delete("/all/delete/my/application/:userId/:jobAppID",handleDeleteMyJobApplication)






