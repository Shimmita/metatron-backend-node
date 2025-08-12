// handle premium enrollment
export const handlePremiumEnrollment=async(req,res)=>{
    try {
        res.status(200).send('yes premium enroll working')
    } catch (error) {
        // debug
        console.log(error.message)
        // send error response
        res.status(400).send(error.message)
    }
}