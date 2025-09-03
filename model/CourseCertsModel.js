import mongoose from "mongoose";


// main course certificate model
const CourseCertsModel = new mongoose.Schema(
  {
    courseId: {
    type: String,
    required: [true, "courseId is required"],
    trim: true,
    },

    studentId: {
    type: String,
    required: [true, "studentId is required"],
    trim: true,
    },

    studentName: {
    type: String,
    required: [true, "student name is required"],
    trim: true,
    },

    instructorId: {
    type: String,
    required: [true, "instructorId is required"],
    trim: true,
    },

    instructorName: {
    type: String,
    required: [true, "instructor name is required"],
    trim: true,
    },

    course_title: {
    type: String,
    required: [true, "course title is required"],
    trim: true,
    },

   price: {
    type: Number,
    required: false,
    default: 0
  },


  payer_name: {
    type: String,
    required: [true, "payer name is required"],
    trim: true,
  },

   status: {
    type: String,
    required: [true, "transaction status is required"],
    trim: true,
    },

    
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("certificates", CourseCertsModel);
