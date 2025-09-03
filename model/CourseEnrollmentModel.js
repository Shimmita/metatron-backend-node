import mongoose from "mongoose";

// main course certificate model
const CourseEnrollmentModel = new mongoose.Schema(
  {
    courseId: {
    type: String,
    required: [true, "courseId is required"],
    trim: true,
    },

    userId: {
    type: String,
    required: [true, "courseId is required"],
    trim: true,
    },

    userRating: {
    type: Number,
    default:0 ,
    required: [true, "rating is required"],
    },

    userPaid:{
      type:Boolean,
      default:false,
      required:false
    }

  },
  {
    timestamps: true,
  }
);

export default mongoose.model("course_enrollment", CourseEnrollmentModel);
