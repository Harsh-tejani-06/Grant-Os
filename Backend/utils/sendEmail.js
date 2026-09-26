const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendApprovalEmail = async (orgEmail, orgName) => {
  try {
    const transporter = createTransporter();
    const loginUrl = `${process.env.FRONTEND_URL}/login`;

    await transporter.sendMail({
      from: `"GrantOS" <${process.env.EMAIL_USER}>`,
      to: orgEmail,
      subject: '✅ Your Organization Has Been Approved — GrantOS',
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #faf6f0; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #4a7c59; font-size: 28px; margin: 0;">Grant<span style="color: #4a7c59;">OS</span></h1>
          </div>
          <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2ddd4;">
            <h2 style="color: #252220; margin-top: 0;">Congratulations! 🎉</h2>
            <p style="color: #514a40; line-height: 1.6;">
              Your organization <strong>${orgName}</strong> has been successfully verified and approved on GrantOS.
            </p>
            <p style="color: #514a40; line-height: 1.6;">
              You can now log in and access all grant discovery features, apply for grants, and manage your organization profile.
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${loginUrl}" style="display: inline-block; background: #4a7c59; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
                Log In to GrantOS
              </a>
            </div>
          </div>
          <p style="text-align: center; color: #a89e8c; font-size: 12px; margin-top: 24px;">
            © ${new Date().getFullYear()} GrantOS. All rights reserved.
          </p>
        </div>
      `,
    });

    console.log(`✅ Approval email sent to ${orgEmail}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send approval email: ${error.message}`);
    return false;
  }
};

const sendRejectionEmail = async (orgEmail, orgName, reason) => {
  try {
    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"GrantOS" <${process.env.EMAIL_USER}>`,
      to: orgEmail,
      subject: '❌ Organization Registration Update — GrantOS',
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #faf6f0; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #4a7c59; font-size: 28px; margin: 0;">Grant<span style="color: #4a7c59;">OS</span></h1>
          </div>
          <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2ddd4;">
            <h2 style="color: #252220; margin-top: 0;">Registration Not Approved</h2>
            <p style="color: #514a40; line-height: 1.6;">
              We regret to inform you that your organization <strong>${orgName}</strong> could not be approved at this time.
            </p>
            <div style="background: #fdf8ef; border: 1px solid rgba(112, 92, 48, 0.15); border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="color: #705c30; margin: 0; font-weight: 600; font-size: 14px;">Reason:</p>
              <p style="color: #705c30; margin: 8px 0 0 0;">${reason}</p>
            </div>
            <p style="color: #514a40; line-height: 1.6;">
              If you believe this is an error or have questions, please contact our support team.
            </p>
          </div>
          <p style="text-align: center; color: #a89e8c; font-size: 12px; margin-top: 24px;">
            © ${new Date().getFullYear()} GrantOS. All rights reserved.
          </p>
        </div>
      `,
    });

    console.log(`✅ Rejection email sent to ${orgEmail}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send rejection email: ${error.message}`);
    return false;
  }
};

const sendAgencyApprovalEmail = async (agencyEmail, agencyName) => {
  try {
    const transporter = createTransporter();
    const loginUrl = `${process.env.FRONTEND_URL}/login`;

    await transporter.sendMail({
      from: `"GrantOS" <${process.env.EMAIL_USER}>`,
      to: agencyEmail,
      subject: '✅ Your Funding Agency Has Been Approved — GrantOS',
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #faf6f0; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #4a7c59; font-size: 28px; margin: 0;">Grant<span style="color: #4a7c59;">OS</span></h1>
          </div>
          <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2ddd4;">
            <h2 style="color: #252220; margin-top: 0;">Congratulations! 🎉</h2>
            <p style="color: #514a40; line-height: 1.6;">
              Your Funding Agency <strong>${agencyName}</strong> has been successfully verified and approved on GrantOS.
            </p>
            <p style="color: #514a40; line-height: 1.6;">
              You can now log in to post grants, manage grant programs, and review incoming proposals.
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${loginUrl}" style="display: inline-block; background: #705c30; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
                Log In to GrantOS
              </a>
            </div>
          </div>
          <p style="text-align: center; color: #a89e8c; font-size: 12px; margin-top: 24px;">
            © ${new Date().getFullYear()} GrantOS. All rights reserved.
          </p>
        </div>
      `,
    });

    console.log(`✅ Agency approval email sent to ${agencyEmail}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send agency approval email: ${error.message}`);
    return false;
  }
};

const sendAgencyRejectionEmail = async (agencyEmail, agencyName, reason) => {
  try {
    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"GrantOS" <${process.env.EMAIL_USER}>`,
      to: agencyEmail,
      subject: '❌ Funding Agency Registration Update — GrantOS',
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #faf6f0; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #4a7c59; font-size: 28px; margin: 0;">Grant<span style="color: #4a7c59;">OS</span></h1>
          </div>
          <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2ddd4;">
            <h2 style="color: #252220; margin-top: 0;">Registration Not Approved</h2>
            <p style="color: #514a40; line-height: 1.6;">
              We regret to inform you that your Funding Agency <strong>${agencyName}</strong> registration could not be approved at this time.
            </p>
            <div style="background: #fdf8ef; border: 1px solid rgba(112, 92, 48, 0.15); border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="color: #705c30; margin: 0; font-weight: 600; font-size: 14px;">Reason:</p>
              <p style="color: #705c30; margin: 8px 0 0 0;">${reason}</p>
            </div>
            <p style="color: #514a40; line-height: 1.6;">
              If you believe this is an error or have questions, please contact our support team.
            </p>
          </div>
          <p style="text-align: center; color: #a89e8c; font-size: 12px; margin-top: 24px;">
            © ${new Date().getFullYear()} GrantOS. All rights reserved.
          </p>
        </div>
      `,
    });

    console.log(`✅ Agency rejection email sent to ${agencyEmail}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send agency rejection email: ${error.message}`);
    return false;
  }
};

const sendCriticalDeadlineEmail = async ({
  recipientEmail,
  recipientName,
  proposalTitle,
  grantAgency,
  grantTitle,
  deadlineDate,
  daysRemaining,
  unapprovedSectionsCount,
  workspaceUrl,
}) => {
  try {
    if (!recipientEmail) return false;
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
      console.log(`[SIMULATED EMAIL] Critical deadline alert sent to ${recipientEmail} for "${proposalTitle}" (${daysRemaining}d left)`);
      return true;
    }

    const transporter = createTransporter();
    const formattedDate = deadlineDate
      ? new Date(deadlineDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Approaching Soon';

    await transporter.sendMail({
      from: `"GrantOS Institutional Alerts" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: `🚨 URGENT: ${daysRemaining <= 1 ? 'Final Day' : `${daysRemaining} Days Left`} — Grant Application Deadline for "${proposalTitle.slice(0, 45)}"`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #fff5f5; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="display: inline-block; background: #fee2e2; color: #991b1b; padding: 6px 16px; border-radius: 9999px; font-weight: 700; font-size: 12px; letter-spacing: 0.5px; border: 1px solid #fca5a5;">
              🚨 CRITICAL GRANT DEADLINE ALERT
            </span>
          </div>

          <div style="background: #ffffff; border-radius: 14px; padding: 28px; border: 1px solid #fecaca; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 20px; line-height: 1.3;">
              Immediate Action Required, ${recipientName || 'Investigator'}
            </h2>
            <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
              The official submission deadline for your institutional grant proposal is approaching within <strong>${daysRemaining} day${daysRemaining === 1 ? '' : 's'}</strong>.
            </p>

            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0 0 6px 0; font-size: 13px; color: #991b1b; font-weight: 700;">PROPOSAL DETAILS</p>
              <p style="margin: 0 0 4px 0; font-size: 15px; color: #111827; font-weight: 600;">${proposalTitle}</p>
              <p style="margin: 0 0 4px 0; font-size: 13px; color: #4b5563;">Funding Agency: <strong>${grantAgency || 'Official Agency'}</strong> ${grantTitle ? `• ${grantTitle}` : ''}</p>
              <p style="margin: 0; font-size: 13px; color: #dc2626; font-weight: 700;">Target Deadline: ${formattedDate} (${daysRemaining} Days Left)</p>
            </div>

            ${
              unapprovedSectionsCount > 0
                ? `<div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; font-size: 13px; color: #92400e;">
                    ⚠️ <strong>${unapprovedSectionsCount} sections</strong> still require review and sign-off before institutional compliance dispatch.
                  </div>`
                : ''
            }

            <div style="text-align: center; margin: 28px 0 16px 0;">
              <a href="${workspaceUrl || `${process.env.FRONTEND_URL}/login`}" style="display: inline-block; background: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 10px rgba(220, 38, 38, 0.3);">
                Open Proposal Workspace & Review
              </a>
            </div>
            <p style="text-align: center; color: #9ca3af; font-size: 12px; margin: 0;">
              Please ensure all institutional clearances, endorsement letters, and budget audits are verified in GrantOS.
            </p>
          </div>

          <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
            © ${new Date().getFullYear()} GrantOS Research Management Suite. All rights reserved.
          </p>
        </div>
      `,
    });

    console.log(`✅ Critical deadline alert email sent to ${recipientEmail}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send critical deadline email: ${error.message}`);
    return false;
  }
};

module.exports = {
  sendApprovalEmail,
  sendRejectionEmail,
  sendAgencyApprovalEmail,
  sendAgencyRejectionEmail,
  sendCriticalDeadlineEmail,
};
