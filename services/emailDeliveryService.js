import Brevo from "@getbrevo/brevo";

export const sendEmailWithBrevo = async ({ to, subject, html }) => {
  if (!process.env.BREVO_API_KEY || !process.env.BREVO_FROM) {
    throw new Error("Brevo configuration is incomplete");
  }

  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.authentications.apiKey.apiKey = process.env.BREVO_API_KEY;

  const sendSmtpEmail = new Brevo.SendSmtpEmail();
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = html;
  sendSmtpEmail.sender = {
    name: process.env.PLATFORM_NAME || "Metatron Dev",
    email: process.env.BREVO_FROM,
  };
  sendSmtpEmail.to = [{ email: to }];

  await apiInstance.sendTransacEmail(sendSmtpEmail);

  return { provider: "brevo" };
};
