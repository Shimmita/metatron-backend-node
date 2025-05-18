import bcrypt from "bcrypt";
import admin from "firebase-admin";
import sharp from "sharp";
import validator from "validator";
import PersonalModel from "../model/personalModel.js";
import ResetCodeModal from "../model/ResetCodeModal.js";
import {
  uploadToCloudinary
} from "../utils/cloudinary.js";
// msg sent to frontend after successful registration
const successMsg =
  "Your account has been created successfully login to explore the world of IT";




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

    // Check if the user already exists in Firestore
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

        // getting vatar url and ID from the result of cloudinary upload
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
      // user neither has data in body request or in firestore, direct them to complete registration
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
        "Your access token has expired. Please sign in to continue with your request.";
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
      throw new Error("Provided email is  malformed!");
    }

    // passwords must be atleast 6 characters
    if (password.length < 6) {
      throw new Error("Password too short must be 6 characters minimum!");
    }

    // check if a user exists in the database based on email first which is unique
    const userFetch = await PersonalModel.findOne({
      email
    });

    if (userFetch) {
      throw new Error("User already registered!");
    }

    // using bcrypt to encrypt user password
    const hashedpass = await bcrypt.hash(password, 10);

    if (!req.file) {
      // save user without avatar
      await PersonalModel.create({
        ...user,
        password: hashedpass,
      });

      await res.status(200).send({
        message: successMsg,
      });
    } else {
      // save user with an avatar
      // Compress and convert the image to AVIF format
      const compressedImageBuffer = await sharp(req.file.buffer)
        .resize({
          width: 500
        }) // Resize to a max width of 500px
        .toFormat("avif", {
          quality: 80
        }) // Convert to AVIF with 80% quality
        .toBuffer();

      // Upload the compressed AVIF image to Cloudinary
      const result = await uploadToCloudinary(
        compressedImageBuffer,
        "metatron/avatars"
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
  const {
    email,
    password
  } = req?.body || {};

  try {
    // check if the provided email is valid like acceptable email
    if (!validator.isEmail(email)) {
      throw new Error("Provided email is malformed!");
    }

    // passwords must be aleast 6 characters
    if (password.length < 6) {
      throw new Error("password too short must be 6 characters minimum!");
    }
    const user = await PersonalModel.findOne({
      email
    });
    // user does not exist
    if (!user) {
      throw new Error(
        "user not found create new account to access our services!"
      );
    }

    // user exists lets check the password provided against the one in the database
    if (await bcrypt.compare(password, user.password)) {
      // add the session user isOnline to true on every request that expires based on session time
      req.session.isOnline = true;
      // add the userId in the session will be used to check if they online or not based on session data
      req.session.userID = user._id;
      res.status(200).send(user);
    } else {
      // incorrect password
      throw new Error("incorrect login credentials!");
    }
  } catch (error) {
    // send the error to the frontend
    res.status(400).send(error.message);
  }
};

// handle reset password
const handleResetPassword = async (req, res) => {
  const {
    email,
    phone
  } = req?.body || {};

  try {
    // check if the provided email is valid like acceptable email
    if (!validator.isEmail(email)) {
      throw new Error("Provided email is malformed!");
    }


    const user = await PersonalModel.findOne({
      email
    });

    // user does not exist
    if (!user) {
      throw new Error(
        "user not found create new account to access our services!"
      );
    }

    // check if provided phone number matches with the one present in DB
    if (user.phone !== phone) {
      throw new Error("provided phone number is invalid")
    }

    // check if any previous reset code exists in the database
    const resetCode = await ResetCodeModal.findOne({
      email
    });
    // if it exists, delete it
    if (resetCode) {
      // delete the previous reset code
      await ResetCodeModal.findOneAndDelete({
        email
      });
    }

    // save in the reset request in the reset code modal
    await ResetCodeModal.create({
      email,
    });


    // password reset code request successful
    res.status(200).json({
      message: 'reset your password now',
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


// complete password reset
const handleCompletePaswordReset = async (req, res) => {
  const {
    email,
    newPassword,


  } = req?.body || {};


  try {
    // check if the provided email is valid like acceptable email
    if (!validator.isEmail(email)) {
      throw new Error("Provided email is malformed!");
    }

    // passwords must be aleast 6 characters  
    if (newPassword?.length < 6) {
      throw new Error("password too short must be 6 characters minimum!");
    }

    // check if this email exists in the resetCode database else reject
    const emilCheck = await ResetCodeModal.findOne({
      email
    })

    if (!emilCheck) {
      throw new Error("please request for a reset code first");
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
      message: 'password reset successfully',
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
  handleCompletePaswordReset,
  handleResetPassword,
  handleSigninPersonal,
  handleSignupPersonal,
  handleSignupPersonalMongo
};