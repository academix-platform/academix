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
  password: string,
) {
  await transporter.sendMail({
    from: `"Academix" <${process.env.SMTP_USER}>`,
    to,
    subject: "Academix - Account Credentials | بيانات حسابك في أكاديميكس",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #4f46e5; margin: 0 0 8px 0; font-size: 24px;">Academix | أكاديميكس</h1>
          <h2 style="color: #1e293b; margin: 0; font-size: 18px;">Welcome to Academix | مرحباً بك في أكاديميكس</h2>
        </div>

        <!-- Arabic Section (RTL) -->
        <div style="direction: rtl; text-align: right; background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 16px; border-right: 4px solid #4f46e5;">
          <p style="margin: 0 0 10px 0; color: #334155; font-size: 15px;">تم إنشاء حسابك بنجاح في المنصة التعليمية. يمكنك الآن تسجيل الدخول باستخدام البيانات التالية:</p>
          <p style="margin: 6px 0; color: #1e293b; font-size: 14px;"><b>اسم المستخدم:</b> <code style="background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${username}</code></p>
          <p style="margin: 6px 0; color: #1e293b; font-size: 14px;"><b>كلمة المرور:</b> <code style="background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${password}</code></p>
        </div>

        <!-- English Section (LTR) -->
        <div style="direction: ltr; text-align: left; background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #4f46e5;">
          <p style="margin: 0 0 10px 0; color: #334155; font-size: 14px;">Your account has been created successfully. You can now log in using the following credentials:</p>
          <p style="margin: 6px 0; color: #1e293b; font-size: 14px;"><b>Username:</b> <code style="background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${username}</code></p>
          <p style="margin: 6px 0; color: #1e293b; font-size: 14px;"><b>Password:</b> <code style="background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${password}</code></p>
        </div>
      </div>
    `,
  });
}

export async function sendSchoolApprovalEmail(
  to: string,
  schoolName: string,
  username: string,
  password: string,
) {
  await transporter.sendMail({
    from: `"Academix" <${process.env.SMTP_USER}>`,
    to,
    subject: "Academix - School Approved | تمت الموافقة على تسجيل المدرسة",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #4f46e5; margin: 0 0 8px 0; font-size: 24px;">Academix | أكاديميكس</h1>
          <h2 style="color: #1e293b; margin: 0; font-size: 18px;">School Registration Approved | تمت الموافقة على تسجيل المدرسة</h2>
        </div>

        <!-- Arabic Section (RTL) -->
        <div style="direction: rtl; text-align: right; background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 16px; border-right: 4px solid #10b981;">
          <p style="margin: 0 0 10px 0; color: #334155; font-size: 15px;">يسرنا إبلاغك بأنه تمت الموافقة على تسجيل مدرستك بنجاح. يمكنك الآن الدخول إلى لوحة التحكم:</p>
          <p style="margin: 6px 0; color: #1e293b; font-size: 14px;"><b>اسم المدرسة:</b> ${schoolName}</p>
          <p style="margin: 6px 0; color: #1e293b; font-size: 14px;"><b>اسم المستخدم:</b> <code style="background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${username}</code></p>
          <p style="margin: 6px 0; color: #1e293b; font-size: 14px;"><b>كلمة المرور:</b> <code style="background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${password}</code></p>
        </div>

        <!-- English Section (LTR) -->
        <div style="direction: ltr; text-align: left; background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981;">
          <p style="margin: 0 0 10px 0; color: #334155; font-size: 14px;">Your school registration has been approved. You can now log in to the admin dashboard:</p>
          <p style="margin: 6px 0; color: #1e293b; font-size: 14px;"><b>School Name:</b> ${schoolName}</p>
          <p style="margin: 6px 0; color: #1e293b; font-size: 14px;"><b>Username:</b> <code style="background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${username}</code></p>
          <p style="margin: 6px 0; color: #1e293b; font-size: 14px;"><b>Password:</b> <code style="background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${password}</code></p>
        </div>
      </div>
    `,
  });
}
