import mongoose from "mongoose";

// content will expires after 1 hour
// and will be deleted from the database
// this is used to store the reset password code
const ResetPasswordSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, "email is required"],
        trim: true,
        unique: true,
    },

    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600 
    }

});


export default mongoose.model("resetCode", ResetPasswordSchema);