import { v2 as cloudinary } from "cloudinary";
import CourseCertsModel from "../model/CourseCertsModel.js";
import CourseEnrollmentModel from "../model/CourseEnrollmentModel.js";
import personalModel from "../model/personalModel.js";
import PostCourseModel from "../model/PostCourseModel.js";
import TechPostModal from "../model/TechPostModel.js";
import { deleteFromCloudinary, deleteVideoFromCloudinary, uploadToCloudinary, uploadVideoToCloudinary, uploadVideoToCloudinaryWithProgress } from "../utils/cloudinary.js";
import { CompressImageFunction } from "../utils/compressImage.js";
import { handleReturnCoursePrice } from "../utils/handleCoursePrice.js";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// course limit is 600MB
const COURSE_LIMIT=600
const MB_CONVERSION=1024*1024


// creating of new course
export const handleCreateNewCourse = async (req, res) => {
  try {
    // Step 1: Basic validation
    if (!req?.files || !req?.files['videos'] || req.files['videos'].length === 0) {
      throw new Error("Please attach course lecture videos");
    }

    // Step 2: Extract and parse the course object
    const dataBody = JSON.parse(req.body?.course);
    const videoFiles = [...req.files['videos']];
    const imageFile = req.files['image']?.[0];

    // if video files are less than 3 at minimum reject
    if (videoFiles.length<3) {
      throw new Error("upload atleast 3 video lectures!")
    }

    // Step 3: Calculate total file size in MB
    let totalSizeMB = 0;
    videoFiles.forEach(file => {
      totalSizeMB += Math.ceil(file.size / MB_CONVERSION);
    });

    if (totalSizeMB > COURSE_LIMIT) {
      throw new Error("Course exceeded 600MB!");
    }

    // each video should be labelled with 'lecture' text
    if (!videoFiles.every(file=>file.originalname.toLowerCase().includes('lecture'))) {
      throw new Error("Label all lectures accordingly!")
    }

    // Step 4: Extract video lecture topics from filenames
    dataBody.course_video_topics = videoFiles.map(file =>
      file.originalname.split(".")[0]
    );

    // Step 5: Upload course logo if provided
    if (imageFile?.buffer) {
      const compressedImageBuffer = await CompressImageFunction(imageFile.buffer);

      const logoUploadResult = await uploadToCloudinary(
        compressedImageBuffer,
        process.env.CLOUDINARY_COURSES_IMAGES_FOLDER
      );

      dataBody.course_logo.logoLink = logoUploadResult?.secure_url;
      dataBody.course_logo.logoID = logoUploadResult?.public_id;
    }

    // Step 6: Upload all videos concurrently and collect results
    const uploadedVideos = await Promise.all(
      videoFiles.map(async (file, idx) => {
        const result = await uploadVideoToCloudinaryWithProgress(
          file.buffer,
          file.originalname,
          process.env.CLOUDINARY_COURSES_VIDEOS_FOLDER,
          (percent) => {
            // Send progress to all SSE clients
            if (req.app.locals.uploadProgressClients) {
              req.app.locals.uploadProgressClients.forEach(client => {
                client.write(`data: {\"videoIndex\":${idx},\"percent\":${percent}}\n\n`);
              });
            }
          }
        );
        return {
          video_lecture_link: result?.secure_url,
          video_lectureID: result?.public_id
        };
      })
    );

    // Step 7: Attach uploaded video info to the course data
    dataBody.course_video_lectures = uploadedVideos;

    // get the price of the course, param is course size
    const price=handleReturnCoursePrice(totalSizeMB)

    // Step 8: Save to MongoDB
    await PostCourseModel.create({
      ...dataBody,
      price
    });

    // Step 9: Send success response
    res.status(200).send("Course uploaded successfully");

  } catch (error) {
    let message = error?.message || "Something went wrong";

    if (message.toLowerCase().includes("cloudinary")) {
      message = "Please check your internet connection";
    } else {
      message = error.message;
    }

    console.error("Upload error:", error.message);
    res.status(400).send(message);
  }
};


// handle course enrollment
export const handleCreateCourseEnrollment=async(req,res)=>{
  try {
    // extract data from the body request
    const dataBody=req?.body || {}
    
    if (!dataBody?.userId) {
      throw new Error("userId not provided!")
    }

    if (!dataBody?.courseId) {
      throw new Error("courseId not provided!")
    }

    const course=await PostCourseModel.findById(dataBody.courseId)
    if (!course || course.isDisabled) {
      throw new Error("course unavailable")
    }

    if (course.externalCourse && course.externalUrl) {
      course.student_count=course.student_count+1

      if (Number(dataBody.ratingValue) > 0) {
        let currentRate=(course.course_rate_count+dataBody.ratingValue)/2
        course.course_rate_count=Number(currentRate.toFixed(1))
      }

      await course.save()

      course.currentUserEnrolled=false
      course.currentUserRating=dataBody.ratingValue || 0

      return res.status(200).send({
        message:"opening external course",
        redirectUrl:course.externalUrl,
        data:course,
        results:[]
      })
    }

    // check if the course already enrolled by the user
    const courseEnrolled=await CourseEnrollmentModel.findOne({
       $and: [{
        userId:dataBody.userId
      }, {
        courseId:dataBody.courseId
      }],
    })


    // already enrolled reject
    if (courseEnrolled) {
      throw new Error("You already enrolled to this course check it in courses enrolled")
    }

    // save the course enrollment
    await CourseEnrollmentModel.create({
      courseId:dataBody?.courseId,
      userId:dataBody?.userId,
      userRating:dataBody?.ratingValue,
    })

    // update the number of students counts of the course
    course.student_count=course.student_count+1

    // course rating= avg (prev+current user rating, its pre-rate)
    let currentRate=(course.course_rate_count+dataBody.ratingValue)/2
    course.course_rate_count=Number(currentRate.toFixed(1))

    // save the updated course rating+student count
    await course.save()

    
    // current user enrolled to the course true, temp on fly
    course.currentUserEnrolled=true

    // current user rating at pre-rate stage
    course.currentUserRating=dataBody.ratingValue

    // search 1st 12 courses and update accordingly, temp on fly if user enrolled
    const courses=await PostCourseModel.find({ isDisabled: { $ne: true } }).limit(12).sort({createdAt:1})

    // fetch all courses enrolled by the current user
    const myEnrolledCourses=await CourseEnrollmentModel.find({userId:dataBody.userId})

    // courses enrolled checked
   const results= courses.map(course=>{

    for (const element of myEnrolledCourses) {
      if (element.courseId===course.id) {
        course.currentUserEnrolled=true
        course.currentUserRating=element.userRating
      }
    }
    return course
    })


    // send success response to the frontend,client
    res.status(200).send({
      // message
      message:"enrolled successfully!",
      // update course Item
      data:course,

      // update whole 1st 12 courses
      results
    })
    
  } catch (error) {
    // debug
    console.log(error.message)

    // send error response to the client
    res.status(400).send(error.message)
  }

}


// get all courses
export const handleGetAllCourses = async (req, res) => {
  try {
    // extract userId
    let {userId}=req?.params || {}
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);
    const skip = (page - 1) * limit;

    // fetch all enrolled courses by the user
    const enrolledCourses=await CourseEnrollmentModel.find({userId})

    // fetch all certificates that user has accredited
     const userCertificates=await CourseCertsModel.find({studentId:userId}) 

    // retrieve all courses in order of latest first, 12 pagination step
    const allCourses = await PostCourseModel.find({ isDisabled: { $ne: true } })
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit);

    // results, after updating enrolled ones
    const results=allCourses.map(course=>{

      // loop through enrolled courses against current course
      for (const enrolledCourse of enrolledCourses) {
        if (enrolledCourse.courseId===course.id) {
          course.currentUserEnrolled=true
          course.currentUserRating=enrolledCourse.userRating
        }
      }

      // loop through user certificates against the current course
      for (const certificate of userCertificates) {
        if (certificate.courseId===course.id) {
          course.currentUserCertified=true
          course.currentCertId=certificate.id
          course.currentCertDate=certificate.createdAt
        }
      }


      return course
    })
    


    // return update course results
    res.status(200).send(results);
  } catch (error) {
    res.status(400).send(error.message);
  }
};

// get top public courses for guest previews
export const handleGetTopCourses = async (req, res) => {
  try {
    const topCourses = await PostCourseModel.find({ isDisabled: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(3);

    res.status(200).send(topCourses);
  } catch (error) {
    res.status(400).send(error.message);
  }
};




export const handleGetSimilarCourses = async (req, res) => {
  try {
    // extract userId
    let {courseId,userId}=req?.params || {}

    // check course presence
    const courseItem=await PostCourseModel.findById(courseId)

    if (!courseItem) {
      throw new Error(
      `Course not found, may be temporarily unavailable, 
      deleted or wrong course Id passed!`)
    }
    
    // get courseItem category main
    const categoryMain=courseItem.course_category.main


    // fetch all certificates that user has accredited
     const userCertificates=await CourseCertsModel.find({studentId:userId}) 

    // fetch all enrolled courses by the user
    const enrolledCourses=await CourseEnrollmentModel.find({userId})

    // retrieve all courses in order of latest first, 12 pagination step
    const allCourses = await PostCourseModel.find({'course_category.main':categoryMain, isDisabled: { $ne: true }})
      .sort({ createdAt: -1 })
      .limit(12);

    // results, after updating enrolled ones, also filter the course from results
    const results=allCourses.filter(course=>course.id!==courseId).map(course=>{

      // loop through enrolled courses against current course
      for (const enrolledCourse of enrolledCourses) {
        if (enrolledCourse.courseId===course.id) {
          course.currentUserEnrolled=true
          course.currentUserRating=enrolledCourse.userRating
        }
      }

        // loop through user certificates against the current course
      for (const certificate of userCertificates) {
        if (certificate.courseId===course.id) {
          course.currentUserCertified=true
          course.currentCertId=certificate.id
          course.currentCertDate=certificate.createdAt
        }
      }

      return course
    })
    
    // return update course results
    res.status(200).send(results);
  } catch (error) {
    // debug
    console.log(error.message)

    // send error to the client
    res.status(400).send(error.message);
  }
};


// handle get popular courses, with higher rating
export const handleGetPopularCourses=async(req,res)=>{
  // retrieve all courses in order of latest first
  try {
    const allPosts = await TechPostModal.find({ isDisabled: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(12);

    // posts are present
    res.status(200).send(allPosts);
  } catch (error) {
    res.status(400).send(error.message);
  }
}



// get specific course 
export const handleGetSpecificCourse = async (req,res) => {
  const {courseId,userId} = req?.params||{}

  try {
    let allCourses=[]
    const course = await PostCourseModel.findById(courseId)
    if (course) {
      if (course.isDisabled) {
        throw new Error("course disabled!")
      }
      allCourses.push(course)
    }


    // fetch all enrolled courses by the user
    const enrolledCourses=await CourseEnrollmentModel.find({userId})

    // fetch all certificates that user has accredited
    const userCertificates=await CourseCertsModel.find({studentId:userId}) 

      // results, after updating enrolled ones
    const results=allCourses.map(course=>{

      // loop through enrolled courses against current course
      for (const enrolledCourse of enrolledCourses) {
        if (enrolledCourse.courseId===course.id) {
          course.currentUserEnrolled=true
          course.currentUserRating=enrolledCourse.userRating
        }
      }

      // loop through user certificates against the current course
      for (const certificate of userCertificates) {
        if (certificate.courseId===course.id) {
          course.currentUserCertified=true
          course.currentCertId=certificate.id
          course.currentCertDate=certificate.createdAt
        }
      }


      return course
    })

    // send results to the fronted
    res.status(200).send(results);
  } catch (error) {
    console.log(error)
    // send error to the client, frontend
    res.status(400).send(error.message);
  }
  
};



// handle rating of the course
export const handleCourseRating=async(req,res)=>{

  try {
    const {userId,courseId,ratingValue}=req?.body || {}

    // check if user and courses exists
    const user=await personalModel.findById(userId)
    const course=await PostCourseModel.findById(courseId)


    // no user such
    if (!user) {
      throw new Error('user does not exist!')
    }
    // course not found
    if (!course) {
      throw new Error('course does not exist')
    }

    // check if user has certification in this course
    const userCertificate=await CourseCertsModel.findOne(
      {
      $and: [{
        courseId
      }, {
        studentId:userId
      }],
    }
    )  
    
    // presence of cert means true user done certification in this course
    if (userCertificate) {
      course.currentUserCertified=true
      course.currentCertId=userCertificate.id
      course.currentCertDate=userCertificate.createdAt
    }
  
    // update the rating value in the enrolled courses db where the userId and courseId match
      const courseEnrolled=await CourseEnrollmentModel.findOne({
      $and: [{
        userId
      }, {
        courseId
      }],
    })

  
    courseEnrolled.userRating= Number(((courseEnrolled.userRating+ratingValue)/2).toFixed(1))

     // update the course general rating value
    course.course_rate_count=Number(((course.course_rate_count+courseEnrolled.userRating)/2).toFixed(1))

    // save the update changes
    await course.save()

    // save the changes on course enrolled
    await courseEnrolled.save()

    // update the current user rating on the course, as per enrollment model
    course.currentUserRating=courseEnrolled.userRating

    //user enrolled true, can't be rated if not enrolled
    course.currentUserEnrolled=true

    // send response rating success to the client, frontend
    res.status(200).send({
      message:'rated successfully!',
      data:course
    })
  
  } catch (error) {
    // debug
    console.log(error.message)
    // send error to the client
    res.status(400).send(error.message)
  }
}


// handle get courses search
export const handleGetAllCoursesSearch=async(req,res)=>{

   try {

    // userId for checking course ownership and enrollment
    const {userId}=req.params || {}

    // fetch all enrolled courses by the user
    const enrolledCourses=await CourseEnrollmentModel.find({userId})

    // fetch all certificates that user has accredited
     const userCertificates=await CourseCertsModel.find({studentId:userId}) 

       // extract the details from the req body
        const {
          job_titles = [], category,
       } = req.body || {};
   
         // Validate course_titles array
       if (!Array.isArray(job_titles)) {
         throw new Error("courses should an array of titles!")
       }

   
        // Initialize query
       const query = {
         $and: [{ isDisabled: { $ne: true } }]
       };
   
         // Handle course_titles search
       if (job_titles.length > 0) {
         query.$and.push({
           $or: [
             ...job_titles.map((term) => ({
               course_title: {
                 $regex: term,
                 $options: "i"
               },
             })),
            
              ...job_titles.map((term) => ({
               "course_category.sub1": {
                 $regex: term,
                 $options: "i"
               },
             })),

              ...job_titles.map((term) => ({
               "course_category.sub2": {
                 $regex: term,
                 $options: "i"
               },
             })),

              ...job_titles.map((term) => ({
               "course_category.sub3": {
                 $regex: term,
                 $options: "i"
               },
             })),

              ...job_titles.map((term) => ({
               "course_category.sub4": {
                 $regex: term,
                 $options: "i"
               },
             })),

           ],
         });
       }
   
         // handle course category
       if (category) {
          query.$and.push({
           "course_category.main": {
             $regex: category,
             $options: "i"
           },
         });
       }

       // Fetch courses from the database latest first on the search results
         const searchResults = await PostCourseModel.find(query).sort({
           createdAt: -1,
       });

        // results, after updating enrolled ones
    const results=searchResults.map(course=>{

      // loop through enrolled courses against the current course
      for (const element of enrolledCourses) {
        if (element.courseId===course.id) {
          course.currentUserEnrolled=true
          course.currentUserEnrolled=element.userRating
        }
      }

       // loop through user certificates against the current course
      for (const certificate of userCertificates) {
        if (certificate.courseId===course.id) {
          course.currentUserCertified=true
          course.currentCertId=certificate.id
          course.currentCertDate=certificate.createdAt
          
        }
      }

      return course
    })
   
       // send response back to the frontend, with updated courses enrollment status
       res.status(200).json({
         message: `found ${searchResults.length} courses`,
         data:results
       })
       
     } catch (error) {
       // log error
       console.log(error.message)
       // send the failure to the frontend
       res.status(400).send(error.message)
     }

}

// handle getting of the recommended course
export const handleGetRecommendedCourse=async(req,res)=>{

  try {

       // extract userId passed in the params
      const {
        userId
      } = req?.params || {}


    // fetch all enrolled courses by the user
    const enrolledCourses=await CourseEnrollmentModel.find({userId})

    // fetch all certificates that user has accredited
     const userCertificates=await CourseCertsModel.find({studentId:userId})
    
      // extract skills of the user from the body request
      const userSkills = req?.body
    
        // Validate job skills array
        if (!Array.isArray(userSkills)) {
          return res.status(400).send("skills should be an array");
        }
    
        // Initialize query
        const query = {
          $and: [{ isDisabled: { $ne: true } }]
        };
    
        // handle job_skill-set search
        if (userSkills.length > 0) {
          query.$and.push({
            $or: [
              ...userSkills.map((term) => ({
                "course_title": {
                  $regex: term,
                  $options: "i"
                },
              })),
              ...userSkills.map((term) => ({
                "course_category.main": {
                  $elemMatch: {
                    $regex: term,
                    $options: "i"
                  }
                },
              })),

               ...userSkills.map((term) => ({
                "course_category.sub1": {
                  $elemMatch: {
                    $regex: term,
                    $options: "i"
                  }
                },
              })),

               ...userSkills.map((term) => ({
                "course_category.sub2": {
                  $elemMatch: {
                    $regex: term,
                    $options: "i"
                  }
                },
              })),

               ...userSkills.map((term) => ({
                "course_category.sub3": {
                  $elemMatch: {
                    $regex: term,
                    $options: "i"
                  }
                },
              })),

               ...userSkills.map((term) => ({
                "course_category.sub4": {
                  $elemMatch: {
                    $regex: term,
                    $options: "i"
                  }
                },
              })),

            ],
          });
        }
    
    
        // fetch courses from the database latest first on the search results
        const searchResults = await PostCourseModel.find(query).sort({
          createdAt: -1,
        });

        // results, after updating enrolled ones
    const results=searchResults.map(course=>{

      // loop through the enrolled courses
      for (const element of enrolledCourses) {
        if (element.courseId===course.id) {
          course.currentUserEnrolled=true
          course.currentUserRating=element.userRating
        }
      }

         // loop through user certificates against the current course
      for (const certificate of userCertificates) {
        if (certificate.courseId===course.id) {
          course.currentUserCertified=true
          course.currentCertId=certificate.id
          course.currentCertDate=certificate.createdAt
        }
      }

      return course
    })


      // send response to the frontend,client
        res.status(200).send(results)
    
  } catch (error) {
    // debug
    console.log(error.message)

    // send error to the frontend,client
    res.status(400).send(error.message)

  }

}

// handle get pdf resources
export const handleGetPDFResources=async(req,res)=>{

}

// handle get enrolled courses by specific user
export const handleGetUserEnrolledCourses=async(req,res)=>{
  try {

    // extract userId from request params
    const {userId}=req?.params || {}


    // holds all full courses details
    let tempCourses=[]

    // fetch all enrolled where userId matches,use the Ids to fetch courses
    const myEnrolledCourses=await CourseEnrollmentModel.find({userId})

    // fetch all certificates that user has accredited
     const userCertificates=await CourseCertsModel.find({studentId:userId})
     
    for (const enrolledCourse of myEnrolledCourses) {
      const course=await PostCourseModel.findById(enrolledCourse.courseId)
      
      // update temp state user enrolled true
      course.currentUserEnrolled=true
      // update temp state user rating
      course.currentUserRating=enrolledCourse.userRating

      // add the course into the list
      tempCourses.push(course)
    }

    // check certified courses in the enrolled courses
    const checkedCertified=tempCourses.map(course=>{
      // loop through user certificates against the current course
      for (const certificate of userCertificates) {
        if (certificate.courseId===course.id) {
          course.currentUserCertified=true
          course.currentCertId=certificate.id
          course.currentCertDate=certificate.createdAt
        }
      }

      return course
    })

    // return the courses to the client,frontend
    res.status(200).send(checkedCertified)

  } catch (error) {
    // debug
    console.log(error.message)
    //send error to the client,frontend
    res.status(400).send(error.message)
  }
}


// get user certificates
export const handleGetUserCerts=async(req,res)=>{
  try {

    // extract ID from the params
    const {userId}=req?.params || {}
    
    // fetch all certs where userId matches
    const myCerts=await CourseCertsModel.find({studentId:userId}).sort({createdAt:1})

    // send the response to the frontend
    res.status(200).send(myCerts)
    
  } catch (error) {
    // debug
    console.log(error.message)
    // send error to the client,frontend
    res.status(400).send(error.message)
  }
}




// handle get courses posted by the current instructor
export const handleGetInstructorCourses=async(req,res)=>{
  try {


    const {userId}=req?.params || {}


    const MyCourses=await PostCourseModel.find({
      "course_instructor.instructorId":userId
    })

    // send response to the client, frontend
    res.status(200).send(MyCourses)
  
  } catch (error) {
    // clg
    console.log(console.log(error.message))
    // send error to the client, fronted
    res.status(400).send(error.message)
  }
}


// edit post
export const handleUpdateCourse = async (req, res) => {
  const id = req.params.id;
  try {
    // Find the course
    const course = await PostCourseModel.findById(id);
    if (!course) throw new Error("Course not found");

    // Parse updated data
    const updatedData = req.body?.course ? JSON.parse(req.body.course) : req.body;
    const videoFiles = req.files?.videos || [];
    const imageFile = req.files?.image?.[0];

    // Handle logo update
    if (imageFile?.buffer) {
      // Delete old logo from Cloudinary
      if (course.course_logo && course.course_logo.logoID) {
        await uploadToCloudinary.destroy(course.course_logo.logoID);
      }
      // Upload new logo
      const compressedImageBuffer = await CompressImageFunction(imageFile.buffer);
      const logoUploadResult = await uploadToCloudinary(
        compressedImageBuffer,
        process.env.CLOUDINARY_COURSES_IMAGES_FOLDER
      );
      updatedData.course_logo = {
        logoLink: logoUploadResult?.secure_url,
        logoID: logoUploadResult?.public_id
      };
    }

    // Handle video update
    if (videoFiles.length > 0) {
      // Delete old videos from Cloudinary
      if (course.course_video_lectures && Array.isArray(course.course_video_lectures)) {
        for (const video of course.course_video_lectures) {
          if (video.video_lectureID) {
            await uploadVideoToCloudinary.destroy(video.video_lectureID, { resource_type: 'video' });
          }
        }
      }
      // Upload new videos
      const uploadedVideos = await Promise.all(
        videoFiles.map(async (file, idx) => {
          const result = await uploadVideoToCloudinary(
            file.buffer,
            file.originalname,
            process.env.CLOUDINARY_COURSES_VIDEOS_FOLDER
          );
          return {
            video_lecture_link: result?.secure_url,
            video_lectureID: result?.public_id
          };
        })
      );
      updatedData.course_video_lectures = uploadedVideos;
      updatedData.course_video_topics = videoFiles.map(file => file.originalname.split(".")[0]);
    }

    // Update course in DB
    await PostCourseModel.findByIdAndUpdate(id, { $set: updatedData });
    res.status(200).send("Course updated successfully");
  } catch (error) {
    // debug
    console.log(error.message)
    res.status(400).send("Failed to update course: " + error.message);
  }
};




export const handleDeleteCourse = async (req, res) => {
  try {

    // extract data from from the params
    const {courseId,userId}=req?.params

    // find course
    const user=await personalModel.findById(userId)

    // Find the course
    const course = await PostCourseModel.findById(courseId);

    // no course found
    if (!course) throw new Error("Course not found!");

    // no user found matching the Id
    if(!user) throw new Error("Instructor not found!")

    // verify that user is the instructor or owner of the course
    if (user.id!==course.course_instructor.instructorId) {
      throw new Error('you do not have access rights to delete this course!')
    }

    // Delete associated videos from Cloudinary
    if (course.course_video_lectures && Array.isArray(course.course_video_lectures)) {
      for (const video of course.course_video_lectures) {
        if (video.video_lectureID) {
          await deleteVideoFromCloudinary(video.video_lectureID)
        }
      }
    }

    // Delete logo from Cloudinary
    if (course.course_logo && course.course_logo.logoID) {
      await deleteFromCloudinary(course.course_logo.logoID)
    }

    // Delete course from DB
    await PostCourseModel.findByIdAndDelete(id);
    res.status(200).send("course deleted successfully");

  } catch (error) {
    // debug
    console.log()
    res.status(400).send(error?.error?.hostname?.includes('cloud') ? "failed to connect to the internet":error.message);
  }
};
