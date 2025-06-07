import mongoose from "mongoose";

// main course certificate model
const CourseFavorites = new mongoose.Schema(
  {
    courseId: {
    type: String,
    required: [true, "courseId is required"],
    trim: true,
    },

    course_title: {
    type: String,
    required: [true, "course title is required"],
    trim: true,
    },

    likers:{
    type:[String],
    required:true,
    default:[],
    }
       
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("course_favorite", CourseFavorites);
