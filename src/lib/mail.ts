import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendAccountEmail(
  to: string,
  username: string,
  password: string
) {
  await transporter.sendMail({
    from: `"Academix" <${process.env.SMTP_USER}>`,
    to,
    subject: "Academix Account Information",
    html: `
      <div style="font-family:Arial;padding:20px">
        <h2>Welcome to Academix</h2>

        <p>Your account has been created successfully.</p>

        <p><b>Username:</b> ${username}</p>
        <p><b>Password:</b> ${password}</p>

        <br/>
      </div>
    `,
  });
}
export async function sendSchoolApprovalEmail(
  to: string,
  schoolName: string,
  username: string,
  password: string
) {
  await transporter.sendMail({
    from: `"Academix" <${process.env.SMTP_USER}>`,
    to,
    subject: "School Registration Approved",
    html: `
      <div style="font-family:Arial;padding:20px">
        <h2>Welcome to Academix</h2>

        <p>Your school registration has been approved successfully.</p>

        <p><b>School Name:</b> ${schoolName}</p>
        <p><b>Username:</b> ${username}</p>
        <p><b>Password:</b> ${password}</p>

        <br/>

        <p>You can now log in to the system.</p>
      </div>
    `,
  });
}