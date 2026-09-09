import AddEventModel from "../model/AddEventModel.js";
import JobPostModel from "../model/JobPostModel.js";
import personalModel from "../model/personalModel.js";
import PostCourseModel from "../model/PostCourseModel.js";
import TechPostModel from "../model/TechPostModel.js";

export const getPlatformInsights = async (req, res) => {
  try {
    const insights = [];
    const tools=[]
    const toolTitles = new Set();
    const visibleFilter = { isDisabled: { $ne: true } };
    const activeJobFilter = { ...visibleFilter, status: "active" };
    const leaderFrom = (records = []) => {
      const item = records.find((record) => record?._id);
      return item ? { label: item._id, count: item.count || 0 } : null;
    };

    const [
      developersTotal,
      activeJobsTotal,
      jobsTotal,
      eventsTotal,
      coursesTotal,
      postsTotal,
      upcomingEventsTotal,
      remoteJobsTotal,
      externalJobsTotal,
      externalEventsTotal,
      externalCoursesTotal,
      postEngagement,
      eventAttendance,
      courseLearning,
    ] = await Promise.all([
      personalModel.countDocuments(),
      JobPostModel.countDocuments(activeJobFilter),
      JobPostModel.countDocuments(visibleFilter),
      AddEventModel.countDocuments(visibleFilter),
      PostCourseModel.countDocuments(visibleFilter),
      TechPostModel.countDocuments(visibleFilter),
      AddEventModel.countDocuments({ ...visibleFilter, dateHosted: { $gte: new Date() } }),
      JobPostModel.countDocuments({ ...activeJobFilter, "jobtypeaccess.access": "Remote" }),
      JobPostModel.countDocuments({ ...visibleFilter, website: { $nin: ["", null] } }),
      AddEventModel.countDocuments({ ...visibleFilter, externalEvent: true }),
      PostCourseModel.countDocuments({ ...visibleFilter, externalCourse: true }),
      TechPostModel.aggregate([
        { $match: visibleFilter },
        {
          $group: {
            _id: null,
            likes: { $sum: "$post_liked.clicks" },
            comments: { $sum: "$post_comments.count" },
            saves: { $sum: "$favorite_count" },
            githubClicks: { $sum: "$post_github.clicks" },
          },
        },
      ]),
      AddEventModel.aggregate([
        { $match: visibleFilter },
        { $group: { _id: null, rsvps: { $sum: "$users.count" } } },
      ]),
      PostCourseModel.aggregate([
        { $match: visibleFilter },
        {
          $group: {
            _id: null,
            students: { $sum: "$student_count" },
            averageRating: { $avg: "$course_rate_count" },
          },
        },
      ]),
    ]);

    // 1. Top Skills
    const topSkills = await personalModel.aggregate([
      { $unwind: "$selectedSkills" },
      { $match: { selectedSkills: { $nin: ["", null] } } },
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
      { $match: visibleFilter },
      { $unwind: "$skills" },
      { $match: { skills: { $nin: ["", null] } } },
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
      { $match: visibleFilter },
      { $match: { category: { $nin: ["", null] } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);

    const [
      topPostCategories,
      topEventCategories,
      topCourseCategories,
      topExternalCourseProviders,
    ] = await Promise.all([
      TechPostModel.aggregate([
        { $match: visibleFilter },
        { $match: { "post_category.main": { $nin: ["", null] } } },
        { $group: { _id: "$post_category.main", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]),
      AddEventModel.aggregate([
        { $match: visibleFilter },
        { $match: { category: { $nin: ["", null] } } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]),
      PostCourseModel.aggregate([
        { $match: visibleFilter },
        { $match: { "course_category.main": { $nin: ["", null] } } },
        { $group: { _id: "$course_category.main", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]),
      PostCourseModel.aggregate([
        { $match: { ...visibleFilter, externalCourse: true } },
        { $match: { externalProvider: { $nin: ["", null] } } },
        { $group: { _id: "$externalProvider", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]),
    ]);

    topJobPosts.forEach(job => {
      insights.push({
        title: `${job._id}`,
        details: `Most jobs are ${job._id}.`
      });
    });

    // updating tools, the most skills by jobs and users
    topSkills.forEach(skill => {
        if (!toolTitles.has(skill._id)) {
        toolTitles.add(skill._id);
        tools.push({
        title: skill._id,
      });
    }
    
    });

    topJobSkills.forEach(skill => {
      if (!toolTitles.has(skill._id)) {
        toolTitles.add(skill._id);
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
        analytics: {
          opportunities: activeJobsTotal + upcomingEventsTotal + coursesTotal,
          upcomingEvents: upcomingEventsTotal,
          remoteJobs: remoteJobsTotal,
          externalJobs: externalJobsTotal,
          externalEvents: externalEventsTotal,
          externalCourses: externalCoursesTotal,
          totalEngagement:
            (postEngagement[0]?.likes || 0) +
            (postEngagement[0]?.comments || 0) +
            (postEngagement[0]?.saves || 0) +
            (postEngagement[0]?.githubClicks || 0) +
            (eventAttendance[0]?.rsvps || 0) +
            (courseLearning[0]?.students || 0),
          postSignals: {
            likes: postEngagement[0]?.likes || 0,
            comments: postEngagement[0]?.comments || 0,
            saves: postEngagement[0]?.saves || 0,
            githubClicks: postEngagement[0]?.githubClicks || 0,
          },
          eventRsvps: eventAttendance[0]?.rsvps || 0,
          courseStudents: courseLearning[0]?.students || 0,
          averageCourseRating: Number((courseLearning[0]?.averageRating || 0).toFixed(1)),
          activeJobShare: jobsTotal ? Math.round((activeJobsTotal / jobsTotal) * 100) : 0,
          remoteJobShare: activeJobsTotal ? Math.round((remoteJobsTotal / activeJobsTotal) * 100) : 0,
          externalCourseShare: coursesTotal ? Math.round((externalCoursesTotal / coursesTotal) * 100) : 0,
        },
        leaders: {
          userSkill: leaderFrom(topSkills),
          jobSkill: leaderFrom(topJobSkills),
          jobCategory: leaderFrom(topJobPosts),
          postCategory: leaderFrom(topPostCategories),
          eventCategory: leaderFrom(topEventCategories),
          courseCategory: leaderFrom(topCourseCategories),
          externalCourseProvider: leaderFrom(topExternalCourseProviders),
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
