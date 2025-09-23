import bcrypt from "bcrypt";
import admin from "firebase-admin";
import nodemailer from 'nodemailer';
import sharp from "sharp";
import validator from "validator";
import EmailVerificationSchema from "../model/EmailVerificationModel.js";
import Brevo from '@getbrevo/brevo'
import { default as PersonalModel, default as personalModel } from "../model/personalModel.js";
import ResetCodeModal from "../model/ResetCodeModal.js";
import {
  uploadToCloudinary
} from "../utils/cloudinary.js";
import { generateResetCode } from "../utils/codeGenerator.js";

// msg sent to frontend after successful registration
const successMsg =
  "Your account has been created successfully pease login.";

const handleSignupPersonal = async (req, res) => {
  // Get token from params
  const firebasetoken = req.params?.token;

  try {
    // Parse the user object from the request body
    const user = JSON.parse(req.body?.user);

    // Parse and setup Firebase service account
    const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);
    serviceAccount.private_key = serviceAccount.private_key.replace(
      /\\n/g,
      "\n"
    );

    // Initialize Firebase Admin SDK only one instance
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    // Decode the Firebase token to get the UID
    const uniqueUserID = (await admin.auth().verifyIdToken(firebasetoken)).uid;

    // Reference the 'Users' collection
    const userRef = admin
      .firestore()
      .collection(process.env.COLLECTION)
      .doc(uniqueUserID);

    // Check if the user already exists in Fire-store
    const userDoc = await userRef.get();
    if (userDoc.exists && Object.keys(userDoc.data()).length > 0) {
      console.log("user exists");
      // User already registered send their data to the frontend
      return res.status(200).send({
        // message true means registered thus navigate user homepage
        message: true,
        user: userDoc.data(), // Return existing user details
      });
    } else if (user?.email && user?.phone) {
      // user has data passed in the body need saving
      //  premium false by default
      user.premium = false;
      // user used premium once
      user.premiumOnce = false;
      // zero networks of connections
      user.network_count = 0;
      // the ids of the networks
      user.network = [];
      // number of posts of the user
      user.post_count = 0;
      // array of user posts will be populated here
      user.post = [];

      if (req.file) {
        // user has an image file passed as request
        // Compress and convert the image to AVIF format
        const compressedImageBuffer = await sharp(req.file.buffer)
          .resize({
            width: 500
          }) // Resize to a max width of 500px
          .toFormat("webp", {
            quality: 80
          }) // Convert to AVIF with 80% quality
          .toBuffer();

        // Upload the compressed AVIF image to Cloudinary
        const result = await uploadToCloudinary(
          compressedImageBuffer,
          "metatron/avatars"
        );

        // getting avatar url and ID from the result of cloudinary upload
        const avatar = result.secure_url;
        const avatarID = result.public_id;
        user.avatar = avatar;
        user.avatarID = avatarID;

        //  save new user details
        await userRef.set(user);
        // Respond with success message
        return res.status(201).send({
          message: successMsg,
        });
      } else {
        // user has default avatar from the auth provider save them
        await userRef.set(user);
        // Respond with success message
        return res.status(201).send({
          message: successMsg,
        });
      }
    } else {
      // user neither has data in body request or in fire-store, direct them to complete registration
      return res.status(200).send({
        incomplete: true,
      });
    }
  } catch (error) {
    console.log("error ");
    // Handle errors and respond accordingly
    let message = error.message;

    if (message.includes("Firebase ID token has expired.")) {
      message =
        "your access token has expired. please sign in.";
    } else {
      message = error.message;
    }

    return res.status(400).send(message);
  }
};

// sign up user personal account but to the mongoDB or related i.e SuperBase or Dynamo AWS
const handleSignupPersonalMongo = async (req, res) => {
  try {
    // Parse the user object from the request body
    const user = JSON.parse(req.body?.user);

    // extracting password and email from the body request
    const {
      password,
      email
    } = user;

    // check if the provided email is valid like acceptable email
    if (!validator.isEmail(email)) {
      throw new Error("provided email is  malformed!");
    }

    // passwords must be at least 6 characters
    if (password.length < 6) {
      throw new Error("password must be 6 characters minimum!");
    }

    // check if a user exists in the database based on email first which is unique
    const userFetch = await PersonalModel.findOne({
      email
    });

    if (userFetch) {
      throw new Error("user already registered!");
    }

    // using bcrypt to encrypt user password
    const hashedpass = await bcrypt.hash(password, 10);

    if (!req.file) {
      // user must provide an image or avatar
      throw new Error('please provide an image or avatar for your profile!')
    } else {
      // save user with an avatar
      // Compress and convert the image to AVIF format
      const compressedImageBuffer = await sharp(req.file.buffer)
        .resize({
          width: 500
        }) // Resize to a max width of 500px
        .toFormat("avif", {
          quality: 70
        }) // Convert to AVIF with 80% quality
        .toBuffer();

      // Upload the compressed AVIF image to Cloudinary
      const result = await uploadToCloudinary(
        compressedImageBuffer,
        process.env.CLOUDINARY_POST_IMAGES_FOLDER
      );

      // extracting the url from the result of cloudinary upload
      const avatar = result.secure_url;
      const avatarID = result.public_id;

      await PersonalModel.create({
        ...user,
        avatar,
        avatarID,
        password: hashedpass,
      });

      await res.status(200).send({
        message: successMsg,
      });
    }
  } catch (error) {
    await res.status(400).send(error.message);
  }
};

// signin user to personal account no provider
const handleSigninPersonal = async (req, res) => {
   const { email, password } = req?.body || {};

  try {
    if (!validator.isEmail(email)) {
      throw new Error("provided email is malformed!");
    }

    if (password.length < 6) {
      throw new Error("password must be 6 characters minimum!");
    }

    const user = await PersonalModel.findOne({ email });
    if (!user) {
      throw new Error("create new account to access our services!");
    }

    if (await bcrypt.compare(password, user.password)) {
      if (user.email_verified) {
        req.session.isOnline = true;
        req.session.userID = user._id;
        return res.status(200).send(user);
      } else {
        let emailVerificationRecords = await EmailVerificationSchema.findOne({ email });
        let tempCode = emailVerificationRecords ? emailVerificationRecords.email_code : generateResetCode();

        const htmlContent = `
          <html>
            <head>
              <meta charset="utf-8">
              <title>Email Verification</title>
              <style>
                body { font-family: sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 20px auto; padding: 20px; background-color: #fff;
                  border-radius: 8px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); }
                h1 { color: #333; }
                .code { font-size: 24px; font-weight: bold; color: #007bff; margin: 20px 0; text-align: center; }
                .note { font-size: 14px; color: #777; }
                .footer { margin-top: 20px; font-size: 12px; color: #999; text-align: center; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Email Verification</h1>
                <p>Thank you for signing up! Please use the verification code below to confirm your email address:</p>
                <div class="code">${tempCode}</div>
                <p class="note">This code is valid for a limited time. If you did not request this, please ignore this email.</p>
                <div class="footer">© ${new Date().getFullYear()} Metatron. All rights reserved.</div>
              </div>
            </body>
          </html>
        `;

        let emailSubject = "Metatron Email Verification Code";

        // --- Brevo SDK setup ---
        let apiInstance = new Brevo.TransactionalEmailsApi();
        let apiKey = apiInstance.authentications["apiKey"];
        // Your Brevo API Key
        apiKey.apiKey = process.env.BREVO_API_KEY; 

        let sendSmtpEmail = new Brevo.SendSmtpEmail();
        sendSmtpEmail.subject = emailSubject;
        sendSmtpEmail.htmlContent = htmlContent;
        sendSmtpEmail.sender = { name: "Metatron", email: process.env.BREVO_FROM };
        sendSmtpEmail.to = [{ email }];

        // Save verification code in DB (replace old record if exists)
        await EmailVerificationSchema.findOneAndUpdate(
          { email },
          { email_code: tempCode },
          { upsert: true, new: true }
        );

        // Send email
        await apiInstance.sendTransacEmail(sendSmtpEmail);

        return res.status(200).send(user.email);
      }
    } else {
      throw new Error("incorrect login credentials!");
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).send(error.message);
  }
};


// handle email verification
export const handleEmailVerification=async(req,res)=>{
  try {
    // extract the details from the body of the request
    const {email,email_code}=req?.body || {}

    // check for user with that email in db
    const user=await personalModel.findOne({email})

    // check in the database if email exists
    const result=await EmailVerificationSchema.findOne({email})
    const databaseCode=result.email_code

    if (!user) {
      throw new Error('user records not found!')
    }

    if (!result) {
      throw new Error('record not found!')
    }

 // checking if the email verification codes are matching
    if (databaseCode==email_code) {
      // updating the user attribute email verified
    user.email_verified=true

    // save the user
    await user.save()

    // delete the verification records
    await EmailVerificationSchema.findOneAndDelete({email})

    // sending the response to the frontend or client
    res.status(200).send('verification successful!')
    }
    else{
      // wrong verification code
      throw new Error('wrong verification code!')
    }    
  } catch (error) {
    // debug error
    console.log(error)
    // send the error back to the client
    res.status(400).send(error.message)
    
  }
}


// handle request password request code
export const handleResetCodeRequest=async(req,res)=>{

  try {
    const {email}=req.body || {}
      // check if the provided email is valid like acceptable email
    if (!validator.isEmail(email)) {
      throw new Error("email is invalid!");
    }

    const user = await PersonalModel.findOne({
      email
    });

       // user does not exist
    if (!user) {
      throw new Error(
        "account records not found!"
      );
    }

     // check for reset code records in the db, if exist then use the email_code and no generations
      const resetCodeRecords=await ResetCodeModal.findOne({email})

      let tempCode="88573"

      if (resetCodeRecords) {
        tempCode=resetCodeRecords.email_code
      }else{
        tempCode=generateResetCode()
      }


        const htmlContent=`<html>
            <head>
              <meta charset="utf-8">
              <title>Email Verification</title>
              <style>
                body {
                  font-family: sans-serif;
                  line-height: 1.6;
                  margin: 0;
                  padding: 0;
                  background-color: #f4f4f4;
                }
                .container {
                  max-width: 600px;
                  margin: 20px auto;
                  padding: 20px;
                  background-color: #fff;
                  border-radius: 8px;
                  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                }
                h1 {
                  color: #333;
                }
                .code {
                  font-size: 24px;
                  font-weight: bold;
                  color: #007bff;
                  margin-top: 20px;
                  margin-bottom: 20px;
                  text-align: center;
                }
                .note {
                  font-size: 14px;
                  color: #777;
                }
                .footer {
                  margin-top: 20px;
                  font-size: 12px;
                  color: #999;
                  text-align: center;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Password Reset Code</h1>
                <p>
                  Please use the password reset code below to change your Metatron account password.:
                </p>
                <div class="code">${tempCode}</div>
                <p class="note">
                  This code is valid for a limited time. If you did not request this, please ignore this email.
                </p>
                <div class="footer">
                  © ${new Date().getFullYear()} Metatron. All rights reserved.
                </div>
              </div>
            </body>
           </html>`

       
        // extract user email
        let emailSubject="Metatron Password Reset Code"

        // creating a transporter
         const transporter = nodemailer.createTransport({
            host: process.env.BREVO_HOST,
            port: 587, // Or 465 for secure SSL/TLS
            secure: false, // true for 465, false for other ports
            auth: {
            user: process.env.BREVO_SMTP_LOGIN, 
            pass: process.env.BREVO_SMTP_KEY
            }
        });

        // mail options
          const mailOptions = {
            from: process.env.BREVO_FROM, 
            to: email, 
            subject:emailSubject,
            html: htmlContent
        };

        // save in the reset request in the reset code, if exists it will throw an error
        await ResetCodeModal.create({
          email,
          email_code:tempCode
        });

    // send the email to the user
    transporter.sendMail(mailOptions)

    // send response back to the frontend
    res.status(200).send({
      message: 'reset code sent!',
      status: true
    })
    
  } catch (error) {
    // debug
    console.log(error)
    res.status(400).send(error.message)
  }
}

// handle reset password
const handleVerifyResetCode = async (req, res) => {
  const {email_code,email:bodyEmail}=req.body || {}
  try { 
    // check if the provided email is valid like acceptable email
    if (!validator.isEmail(bodyEmail)) {
      throw new Error("email is invalid!");
    }

    // locate user record
    const user = await personalModel.findOne({
      email: bodyEmail
    });
    // locate verification records
    const verificationRecords=await ResetCodeModal.findOne({email:bodyEmail})

    // user does not exist
    if (!user) {
      throw new Error(
        "account records not found!"
      );
    }

    if (!verificationRecords) {
      throw new Error("request for code!")
    }

    // compare the two emailCodes records, one from body and other in db
    if (email_code===verificationRecords.email_code) {

    // password reset code request successful
    res.status(200).json({
      message: 'complete password reset',
      status: true
    })
    } else {
      throw new Error('invalid reset code!')
    }

  } catch (error) {
    // debug
    console.error('failed to send email:', error);
    // send the error to the frontend
    res.status(400).json({
      message: error.message,
      status: false
    });
  }
};


// complete password reset
const handleCompletePasswordReset = async (req, res) => {
  const {
    email,
    newPassword
  } = req?.body || {};


  try {
    // check if the provided email is valid like acceptable email
    if (!validator.isEmail(email)) {
      throw new Error("email is invalid!");
    }

    // passwords must be at least 6 characters  
    if (newPassword?.length < 6) {
      throw new Error("password must be 6 characters minimum!");
    }

    // check if this email exists in the resetCode database else reject
    const emilCheck = await ResetCodeModal.findOne({
      email
    })

    if (!emilCheck) {
      throw new Error("unauthorized request!");
    }

    // using bcrypt to encrypt user password
    const hashedpass = await bcrypt.hash(newPassword, 10);

    //save this new password to the database of the user
    await PersonalModel.findOneAndUpdate({
      email
    }, {
      password: hashedpass,
    }, {
      new: true
    });
    // delete the reset code from the database
    await ResetCodeModal.findOneAndDelete({
      email
    })

    res.status(200).json({
      message: 'changed successfully!',
      status: true
    })

  } catch (error) {
    // monitor the error
    console.error('Failed to send email:', error);
    // send the error to the frontend
    res.status(400).json({
      message: error.message,
      status: false
    });
  }
};


export {
  handleCompletePasswordReset as handleCompletePaswordReset,
  handleVerifyResetCode as handleResetPassword,
  handleSigninPersonal,
  handleSignupPersonal,
  handleSignupPersonalMongo
};
