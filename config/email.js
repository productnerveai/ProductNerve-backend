const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
  try {
    console.log('Attempting to send email to:', to);
    console.log('From:', `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`);
    console.log('API Key exists:', !!process.env.RESEND_API_KEY);
    
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('Email sending failed:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return { success: false, error };
    }

    console.log('Email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Email service error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return { success: false, error };
  }
};

module.exports = { sendEmail };
