import mongoose from "mongoose";

const EmailVerificationSchema = new mongoose.Schema(
  {
     email: {
      type:String,
      required:false,
      unique:[true,'verification code sent to your email']
    },
    email_code: {
      type:String,
      required:[true,'provide email verification code'],
      trim:true
    },
  },
  {timestamps:true},
);


export default mongoose.model("email_verification", EmailVerificationSchema);
