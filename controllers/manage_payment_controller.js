import paypal from '@paypal/checkout-server-sdk'
import CourseCertsModel from "../model/CourseCertsModel.js"
import PostCourseModel from "../model/PostCourseModel.js"
import { paypalClient } from '../utils/paypalClient.js';
import personalModel from '../model/personalModel.js';


// handle creating of paypal order, send it to client
export const handleCreatePaypalOrderIdCourses=async(req,res)=>{
    /* try {
     const data=req.body || {}

      const cert=await CourseCertsModel.create(data)

      const course=await PostCourseModel.findById(data.courseId)

      course.currentCertDate=cert.createdAt
      course.currentUserCertified=true
      course.currentCertId=cert.id
      course.currentUserEnrolled=true

      res.status(200).send(course)
        
    } catch (error) {
        // debug
        console.log(error.message)

        // send error to the frontend, client
        res.status(400).send(error.message)

    } */


        try {
    const { amount, description } = req.body || {};

    // TODO (recommended): derive amount from your internal course catalog by courseId
    const safeAmount = Number(amount || 10).toFixed(2); // defend against undefined/non-number
    const safeDescription = description || "Course Certificate Purchase";

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          description: safeDescription,
          amount: {
            currency_code: "USD",
            value: safeAmount,
            // optional breakdown:
            // breakdown: { item_total: { currency_code: "USD", value: safeAmount } }
          },
        },
      ],
    });

    const order = await paypalClient.execute(request);

    return res.status(200).json({ id: order.result.id });
  } catch (err) {
    console.error("Create order error:", err);
    return res.status(500).json({ error: "Failed to create order" });
  }

}


// handle processing of the orderId from the client
export const handleProcessingOrderIdCourses=async(req,res)=>{

  try {
    // extract courseId and studentId from the request body
    const {courseId,studentId}=req?.body || {}

    // extract the orderId from the params
    const { orderId } = req.params || {} ;


    // check the course and student from db if they exist or not
    const course=await PostCourseModel.findById(courseId)
    const student=await personalModel.findById(studentId)

    // no process
    if (!course) {
      throw new Error('course not found it may be temporarily unavailable or deleted from the database!')
    }

    // no student
    if (!student) {
      throw new Error('student making the course payment request is not found, please create an account!')
    }

    // continue with the process
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({}); 

    const capture = await paypalClient.execute(request);
    const details = capture.result; 

    // Extract info safely
    const status = details.status;
    const payer = details.payer || {};
    const nameObj = payer.name || {};
    const purchase = details.purchase_units?.[0] || {};
    const firstCapture = purchase.payments?.captures?.[0] || {};
    const amountObj = firstCapture.amount || {};

    if (status === "COMPLETED") {
      // save the certificate, payment was success
      await CourseCertsModel.create({
        courseId,
        studentId,
        course_title:course.course_title,
        instructorId:course.course_instructor.instructorId,
        instructorName:course.course_instructor.instructorName,
        studentName:student.name,
        status,
        payer_name:nameObj,
        price:course.price,
      })
    
    }

    console.log('outside completed')
    console.log(status,payer,nameObj,purchase,firstCapture,amountObj)


  } catch (err) {
    console.error("Capture error:", err);
    return res.status(500).json({ error: "Failed to capture order" });
  }
}