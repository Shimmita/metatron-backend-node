import AddEventModel from "../model/AddEventModel.js";
import JobPostModel from "../model/JobPostModel.js";
import personalModel from "../model/personalModel.js";
import TechPostModel from "../model/TechPostModel.js";

export const getPlatformInsights = async (req, res) => {
  try {
    const insights = [];
    const tools=[]

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

    // 4. Most Popular Post Topics
    const topPostCategories = await TechPostModel.aggregate([
      { $group: { _id: "$post_category.main", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);

    topPostCategories.forEach(post => {
      insights.push({
        title: `${post._id}`,
        details: `Most post on ${post._id}.`
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
        insights,
        tools
    });

  } catch (error) {
    console.error("Insight error:", error);
    res.status(500).json({ message: "Error generating insights" });
  }
};
