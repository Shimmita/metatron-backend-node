import mongoose from "mongoose";

// content will expires after 1 hour
// and will be deleted from the database
// this is used to store the reset password code
const ResetPasswordSchema = new mongoose.Schema({
    
      email: {
      type:String,
      required:false,
      unique:[true,'code already sent!'],
      required:[true,'email required!']
    },
    email_code: {
      type:String,
      required:[true,'verification code required!'],
      trim:true
    },

},{timestamps:true});


export default mongoose.model("resetCode", ResetPasswordSchema);