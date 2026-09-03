import AddEventModel from "../model/AddEventModel.js";
import JobPostModel from "../model/JobPostModel.js";
import personalModel from "../model/personalModel.js";
import PostCourseModel from "../model/PostCourseModel.js";
import TechPostModel from "../model/TechPostModel.js";

export const getPlatformInsights = async (req, res) => {
  try {
    const insights = [];
    const tools=[]

    const [
      developersTotal,
      activeJobsTotal,
      jobsTotal,
      eventsTotal,
      coursesTotal,
      postsTotal,
    ] = await Promise.all([
      personalModel.countDocuments(),
      JobPostModel.countDocuments({ status: "active" }),
      JobPostModel.countDocuments(),
      AddEventModel.countDocuments(),
      PostCourseModel.countDocuments(),
      TechPostModel.countDocuments(),
    ]);

    // 1. Top Skills
    const topSkills = await personalModel.aggregate([
      { $unwind: "$selectedSkills" },
      { $group: { _id: "$selectedSkills", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 2 }
    ]);

    topSkills.slice(0,1).forEach(skill => {
      insights.push({
        title: `${skill._id} Skills in Most Users`,
        details: `${skill._id} is the widely used tool by users.`
      });
    });

 
    // 3. Most Requested Skills in Jobs
    const topJobSkills = await JobPostModel.aggregate([
      { $unwind: "$skills" },
      { $group: { _id: "$skills", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 }
    ]);

    topJobSkills.slice(0,1).forEach(skill => {
      insights.push({
        title: `${skill._id} Skills in Most Roles`,
        details: `Most jobs list ${skill._id} as a required skill.`
      });
    });

    // 4. popular job posts
    const topJobPosts = await JobPostModel.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);

    topJobPosts.forEach(job => {
      insights.push({
        title: `${job._id}`,
        details: `Most jobs are ${job._id}.`
      });
    });

    // updating tools, the most skills by jobs and users
    topSkills.forEach(skill => {
        if (!tools.includes(skill._id)) {
        tools.push({
        title: skill._id,
      });
    }
    
    });

    topJobSkills.forEach(skill => {
      if (!tools.includes(skill._id)) {
        tools.push({
        title: skill._id});
    }
    });


    // send response to the frontend
    res.status(200).json({
        totals: {
          developers: developersTotal,
          techGigs: activeJobsTotal,
          jobs: jobsTotal,
          events: eventsTotal,
          courses: coursesTotal,
          posts: postsTotal,
        },
        insights,
        tools
    });

  } catch (error) {
    console.error("Insight error:", error);
    res.status(500).json({ message: "Error generating insights" });
  }
};

// handle fetching of all recommendation insights
export const getAllInsightsRecommendation=async(req,res)=>{
  
  try {

    // will store final output
    let outPutData=[]

    // 1. Top skills in users
    const topUserSkills = await personalModel.aggregate([
      { $unwind: "$selectedSkills" },
      { $group: { _id: "$selectedSkills", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 }
    ]);

    // 3. Most Requested Skills in Jobs
    const topJobSkills = await JobPostModel.aggregate([
      { $unwind: "$skills" },
      { $group: { _id: "$skills", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 }
    ]);

    //5. top job categories
     const topJobCategory = await JobPostModel.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 }
    ]);

  
    // 6. Most Popular Post Topics
    const topPostCategories = await TechPostModel.aggregate([
      { $group: { _id: "$post_category.main", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 }
    ]);

    // 5. Most Popular Events Post
    const topEventCategories = await AddEventModel.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 }
    ]);

    // 7. Most Popular courses
    const topCoursesCategories=await PostCourseModel.aggregate([
      { $group: { _id: "$course_category.main", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 }
    ])

    // details are returned based and description sorted by length ascending
    topUserSkills.length && outPutData.push({label:"skills possessed by most users ", description:topUserSkills.map(skill=>skill._id).sort((a,b)=>a.length-b.length)})
    topJobSkills.length && outPutData.push({label:"skills required by most recruiters", description:topJobSkills.map(job=>job._id).sort((a,b)=>a.length-b.length)})
    topJobCategory.length && outPutData.push({label:"Popular jobs posted by recruiters", description:topJobCategory.map(job=>job._id).sort((a,b)=>a.length-b.length)})
    topEventCategories.length && outPutData.push({label:"Popular tech events posted by users", description:topEventCategories.map(event=>event._id).sort((a,b)=>a.length-b.length)})
    topPostCategories.length && outPutData.push({label:"Top milestone posts done by users", description:topPostCategories.map(post=>post._id).sort((a,b)=>a.length-b.length)})
    topCoursesCategories.length && outPutData.push({label:"Popular courses posted by instructors", description:topCoursesCategories.map(course=>course._id).sort((a,b)=>a.length-b.length)})


    // send the response to the frontend, client
    res.status(200).send(outPutData)

  } catch (error) {
    console.error("error:", error);
    res.status(500).send(error.message);
  }
}
