import mongoose from "mongoose";


// applicant schema : applicantId=>certId
const certApplicantSchema=new mongoose.Schema({
    applicantId:{
        type:String,
        required:true,
        default:""
    },

    certId:{
        type:String,
        required:true
    },
    _id: false, 
})

// main course certificate model
const CourseCertsModel = new mongoose.Schema(
  {
    courseId: {
    type: String,
    required: [true, "courseId is required"],
    trim: true,
    },

    instructorId: {
    type: String,
    required: [true, "instructorId is required"],
    trim: true,
    },

    course_title: {
    type: String,
    required: [true, "course title is required"],
    trim: true,
    },

    applicants:{
    type:[certApplicantSchema],
    required:true,
    default:[],
    }
    
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("certificates", CourseCertsModel);
