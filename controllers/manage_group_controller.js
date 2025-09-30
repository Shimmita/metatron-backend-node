import GroupCommunityModel from "../model/GroupCommunityModel.js"
import personalModel from "../model/personalModel.js"
import TechPostModel from "../model/TechPostModel.js"

export const handleJoinGroupCommunity=async(req,res)=>{
    try {
        const {userId,groupId}=req?.body

        // check user availability
        const user=await personalModel.findById(userId)
        const group=await GroupCommunityModel.findById(groupId)

        // user don't exist reject
        if (!user) {
            throw new Error('user not found in the records, please create a new account!')
        }

        if (!group) {
            throw new Error('group not found in the records!')
        }

        // group found, add the userId in the members list, counts too
        if (!group.members.includes(userId)) {
            group.members=[...group.members,userId]
            group.total=group.total+1

            // save the changes
            await group.save()
        }


        // add the group into the user attribute too
        if (!user.groups.includes(group.name)) {
            user.groups=[...user.groups, group.name]
            await user.save()
        }

        // send response back to the frontend
        res.status(200).send(
            `You have successfully joined ${group.name}. you can now view the 
            group in details`)
        
    } catch (error) {
        
        // debug
        console.log(error.message)

        // send error to the client
        res.status(400).send(error.message)
    }
}

// handle fetching of all groups
 export const handleGetAllGroupsCommunity=async(req,res)=>{
    try {
        const {userId}=req?.params

        const groupsCommunity=await GroupCommunityModel.find({}).sort({name:1})

        // check if user id is present in any of the groups, update isMember true
        for (const element of groupsCommunity) {
            if (element.members.includes(userId)) {
                element.isMember=true
            }
        }

        // send response to the frontend
        res.status(200).send(groupsCommunity)
        
    } catch (error) {
        // debug
        console.log(error.message)
        // send error to the frontend
        res.status(400).send(error.message)
    }
}


// handle fetch details of a given post
export const handleFetchGroupDetails=async(req,res)=>{
    try {
        const {userId,groupId}=req?.params
        // check if user and group exist
        const user=await personalModel.findById(userId)
        const group=await GroupCommunityModel.findById(groupId)

        if (!user) {
            throw new Error('user records not found, please create new account')
        }

        if (!group) {
            throw new Error('group records not found!')
        }

        let tempUsers=[]
        let tempPosts=[]

        // retrieving the details of  users in the group
        for (const memberId of group.members) {
        
        tempUsers=[...tempUsers, await personalModel.findById(memberId)]

        // return top 5 users only, strategize top actively users only
        if (tempUsers.length==6) {
            break
        }

        }

        // retrieving all posts posted in the group
        for (const postId of group.posts) {
            tempPosts=[...tempPosts, await TechPostModel.findById(postId)]

            // return top 20 posts only, strategize, posts with more likes or comments
            if (tempPosts.length==21) {
                break
            }
        }


        // return fetched users(top 5) and posts and group itself to the client
        res.status(200).send({
            users:tempUsers,
            posts:tempPosts,
            group
        })
        
    } catch (error) {
        // debug
        console.log(error)
        // send error to the frontend
        res.status(400).send(error.message)
    }
}