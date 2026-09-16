import mongoose from "mongoose";

const EmailVerificationSchema = new mongoose.Schema(
  {
     email: {
      type:String,
      required:[true,'email required!'],
      unique:[true,'verification code sent to your email'],
      trim:true,
      lowercase:true,
    },
    email_code: {
      type:String,
      required:[true,'provide email verification code'],
      trim:true
    },
    expiresAt: {
      type: Date,
      required: [true, 'provide verification code expiry'],
      index: { expires: 0 },
    },
  },
  {timestamps:true},
);


export default mongoose.model("email_verification", EmailVerificationSchema);
