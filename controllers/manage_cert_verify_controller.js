import mongoose from "mongoose"
import CourseCertsModel from "../model/CourseCertsModel.js"

export const handleCertificateVerification=async(req,res)=>{
    try {

        // extract certID from request body
        const {certID}=req?.body || {}
        // converting string certID into type ID mongoose
        const finalIDObject=new mongoose.Types.ObjectId(certID)
        // fetch in the certs model if present by ID
        const certificate=await CourseCertsModel.findById(finalIDObject)
        // cert not found, its fake
        if (!certificate) {
        throw new Error('certificate not found!')
        }

        // certificate present,send to the client,response
        res.status(200).send(certificate)
        
    } catch (error) {
        // debug 
        console.log(error.message)
        // send the error back to the client,frontend
        res.status(400).send('certificate not found!')
    }
}