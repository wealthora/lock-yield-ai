import emailjs from '@emailjs/browser';

// EmailJS Configuration
const EMAILJS_PUBLIC_KEY = 'jKYyvu6fVyLHqnuJ-';
const SERVICE_ID = 'service_t1xrjeb';
const SIGNUP_TEMPLATE_ID = 'template_pgmy19v';
const RESET_TEMPLATE_ID = 'template_qm1e5fu';

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

export const sendSignupConfirmationEmail = async (
  email: string,
  firstName: string,
  confirmationLink: string
) => {
  try {
    const response = await emailjs.send(
      SERVICE_ID,
      SIGNUP_TEMPLATE_ID,
      {
        to_email: email,
        to_name: firstName,
        confirmation_link: confirmationLink,
      },
      EMAILJS_PUBLIC_KEY
    );
    console.log('Signup confirmation email sent:', response);
    return { success: true };
  } catch (error) {
    console.error('Failed to send signup confirmation email:', error);
    return { success: false, error };
  }
};

export const sendPasswordResetEmail = async (
  email: string,
  resetLink: string
) => {
  try {
    const response = await emailjs.send(
      SERVICE_ID,
      RESET_TEMPLATE_ID,
      {
        to_email: email,
        reset_link: resetLink,
      },
      EMAILJS_PUBLIC_KEY
    );
    console.log('Password reset email sent:', response);
    return { success: true };
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return { success: false, error };
  }
};
