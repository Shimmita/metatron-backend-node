import express from "express";
import multer from "multer";
import {
  handleCourseRating,
  handleCreateCourseEnrollment,
  handleCreateNewCourse,
  handleDeleteCourse,
  handleGetAllCourses,
  handleGetAllCoursesSearch,
  handleGetInstructorCourses,
  handleGetPDFResources,
  handleGetPopularCourses,
  handleGetRecommendedCourse,
  handleGetSimilarCourses,
  handleGetSpecificCourse,
  handleGetUserCerts,
  handleGetUserEnrolledCourses,
  handleUpdateCourse
} from "../controllers/manage_courses_controller.js";
import { handleAuthMiddleware } from "../middlewares/auth_middleware.js";

// Set up multer for file uploads
const uploadMulter = multer({ storage: multer.memoryStorage() });

export const coursesManageRouter = express.Router();

//create post route
coursesManageRouter.post(
  "/create",
  uploadMulter.fields([{name:'videos'},{name:'image'}]),
  handleAuthMiddleware,
  handleCreateNewCourse
);


// get all courses posts, userId for checking if user enrolled in any
coursesManageRouter.get("/all/:userId", handleGetAllCourses);

// handle get specific course
coursesManageRouter.get("/all/specific/:userId/:courseId", handleGetSpecificCourse);

// retrieves courses search
coursesManageRouter.post("/all/search/:userId",handleAuthMiddleware, handleGetAllCoursesSearch);

// course rating
coursesManageRouter.patch("/all/rating",handleAuthMiddleware, handleCourseRating);

// enroll into a course
coursesManageRouter.post("/enroll",handleAuthMiddleware,handleCreateCourseEnrollment)

// get all popular courses
coursesManageRouter.get("/all/popular",handleAuthMiddleware, handleGetPopularCourses);

// get all similar courses
coursesManageRouter.get("/all/similar/:userId/:courseId", handleGetSimilarCourses);

// get specific post
coursesManageRouter.get("/all/:id",handleAuthMiddleware,handleGetSpecificCourse)

// get recommended course, AI and based on user skills
coursesManageRouter.post("/all/recommended/:userId",handleAuthMiddleware,handleGetRecommendedCourse)

// get pdf resources
coursesManageRouter.get("/all/pdf/resources",handleAuthMiddleware,handleGetPDFResources)

// get enrolled courses
coursesManageRouter.get("/all/enrolled/:userId",handleAuthMiddleware,handleGetUserEnrolledCourses)

// get course certs done by the user
coursesManageRouter.get("/all/certs/:userId",handleAuthMiddleware,handleGetUserCerts)


// INSTRUCTOR ROUTE

coursesManageRouter.get("/all/instructor/:userId",handleAuthMiddleware, handleGetInstructorCourses);

// edit post
coursesManageRouter.put("/all/instructor/update/:id",handleAuthMiddleware, handleUpdateCourse);

// delete post
coursesManageRouter.delete("/all/delete/instructor/:userId/:courseId",handleAuthMiddleware, handleDeleteCourse);


