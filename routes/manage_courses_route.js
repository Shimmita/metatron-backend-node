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

// Set up multer for file uploads
const uploadMulter = multer({ storage: multer.memoryStorage() });

export const coursesManageRouter = express.Router();

//create post route
coursesManageRouter.post(
  "/create",
  uploadMulter.fields([{name:'videos'},{name:'image'}]),
  handleCreateNewCourse
);


// get all courses posts, userId for checking if user enrolled in any
coursesManageRouter.get("/all/:userId", handleGetAllCourses);

// retrieves courses search
coursesManageRouter.post("/all/search/:userId", handleGetAllCoursesSearch);

// course rating
coursesManageRouter.patch("/all/rating", handleCourseRating);

// enroll into a course
coursesManageRouter.post("/enroll",handleCreateCourseEnrollment)

// get all popular courses
coursesManageRouter.get("/all/popular", handleGetPopularCourses);

// get all similar courses
coursesManageRouter.get("/all/similar/:userId/:courseId", handleGetSimilarCourses);

// get specific post
coursesManageRouter.get("/all/:id",handleGetSpecificCourse)

// get recommended course, AI and based on user skills
coursesManageRouter.post("/all/recommended/:userId",handleGetRecommendedCourse)

// get pdf resources
coursesManageRouter.get("/all/pdf/resources",handleGetPDFResources)

// get enrolled courses
coursesManageRouter.get("/all/enrolled/:userId",handleGetUserEnrolledCourses)

// get course certs done by the user
coursesManageRouter.get("/all/certs/:userId",handleGetUserCerts)


// INSTRUCTOR ROUTE

coursesManageRouter.get("/all/instructor/:userId", handleGetInstructorCourses);

// edit post
coursesManageRouter.put("/all/instructor/update/:id", handleUpdateCourse);

// delete post
coursesManageRouter.delete("/all/delete/instructor/:userId/:courseId", handleDeleteCourse);


