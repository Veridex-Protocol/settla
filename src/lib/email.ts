/**
 * Email Service for Sera Dashboard
 * 
 * Handles sending transactional emails using Resend
 */

import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Email templates
export type EmailTemplate =
  | 'invoice_created'
  | 'invoice_paid'
  | 'invoice_reminder'
  | 'payment_received'
  | 'receipt'
  | 'welcome'
  | 'verification_required'
  | 'team_invite'
  | 'digest';

interface EmailRecipient {
  email: string;
  name?: string;
}

interface BaseEmailData {
  businessName: string;
  businessEmail?: string;
}

interface InvoiceEmailData extends BaseEmailData {
  invoiceNumber: string;
  amount: string;
  currency: string;
  customerName: string;
  dueDate?: string;
  paymentLink?: string;
  items?: Array<{ description: string; amount: string }>;
}

interface PaymentEmailData extends BaseEmailData {
  transactionId: string;
  amount: string;
  currency: string;
  txHash?: string;
  explorerUrl?: string;
}

interface ReceiptEmailData extends BaseEmailData {
  receiptNumber: string;
  amount: string;
  currency: string;
  date: string;
  pdfUrl?: string;
  items: Array<{ description: string; quantity: number; unitPrice: string; total: string }>;
  subtotal: string;
  tax?: string;
  total: string;
}

interface TeamInviteEmailData extends BaseEmailData {
  inviteeName?: string;
  inviterName: string;
  role: string;
  inviteLink: string;
}

interface DigestEmailData extends BaseEmailData {
  periodStart: string;
  periodEnd: string;
  totalRevenue: string;
  transactionCount: string;
  invoicesSent: string;
  invoicesPaid: string;
  topCurrency: string;
  revenueChange: string;
  isPositiveChange: boolean;
}

export type EmailData = InvoiceEmailData | PaymentEmailData | ReceiptEmailData | TeamInviteEmailData | DigestEmailData | BaseEmailData;

/**
 * Send an email using Resend
 */
export async function sendEmail(
  template: EmailTemplate,
  to: EmailRecipient | EmailRecipient[],
  data: EmailData
): Promise<{ success: boolean; id?: string; error?: string }> {
  const recipients = Array.isArray(to) ? to : [to];
  const toAddresses = recipients.map(r => r.email);

  try {
    const { subject, html, text } = generateEmailContent(template, data);

    const result = await resend.emails.send({
      from: `Settla <payments@${process.env.RESEND_DOMAIN || 'sera.veridex.io'}>`,
      to: toAddresses,
      subject,
      html,
      text,
      headers: {
        'X-Entity-Ref-ID': `sera-${template}-${Date.now()}`,
      },
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('[Email Error]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
}

/**
 * Generate email content based on template
 */
function generateEmailContent(
  template: EmailTemplate,
  data: EmailData
): { subject: string; html: string; text: string } {
  const baseStyles = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background-color: #f8fafc;
  `;

  switch (template) {
    case 'invoice_created':
      return generateInvoiceCreatedEmail(data as InvoiceEmailData);
    case 'invoice_paid':
      return generateInvoicePaidEmail(data as InvoiceEmailData);
    case 'payment_received':
      return generatePaymentReceivedEmail(data as PaymentEmailData);
    case 'receipt':
      return generateReceiptEmail(data as ReceiptEmailData);
    case 'welcome':
      return generateWelcomeEmail(data);
    case 'team_invite':
      return generateTeamInviteEmail(data as TeamInviteEmailData);
    case 'digest':
      return generateDigestEmail(data as DigestEmailData);
    default:
      return {
        subject: 'Notification from Settla',
        html: `<p>You have a notification from ${data.businessName}</p>`,
        text: `You have a notification from ${data.businessName}`,
      };
  }
}

function generateInvoiceCreatedEmail(data: InvoiceEmailData) {
  const subject = `Invoice ${data.invoiceNumber} from ${data.businessName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 14px; margin-bottom: 16px;">
                <span style="color: white; font-size: 24px; font-weight: bold;">S</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1e293b;">New Invoice</h1>
              <p style="margin: 8px 0 0; color: #64748b; font-size: 16px;">from ${data.businessName}</p>
            </td>
          </tr>
          
          <!-- Invoice Details Card -->
          <tr>
            <td style="padding: 20px 40px;">
              <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">
                      <p style="margin: 0; color: #64748b; font-size: 14px;">Invoice Number</p>
                      <p style="margin: 4px 0 0; color: #1e293b; font-size: 18px; font-weight: 600;">${data.invoiceNumber}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 16px 0;">
                      <p style="margin: 0; color: #64748b; font-size: 14px;">Amount Due</p>
                      <p style="margin: 4px 0 0; color: #1e293b; font-size: 32px; font-weight: 700;">${data.amount} <span style="font-size: 18px; color: #64748b;">${data.currency}</span></p>
                    </td>
                  </tr>
                  ${data.dueDate ? `
                  <tr>
                    <td style="padding-top: 16px; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0; color: #64748b; font-size: 14px;">Due Date</p>
                      <p style="margin: 4px 0 0; color: #1e293b; font-size: 16px; font-weight: 500;">${data.dueDate}</p>
                    </td>
                  </tr>
                  ` : ''}
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Pay Button -->
          ${data.paymentLink ? `
          <tr>
            <td style="padding: 20px 40px;">
              <a href="${data.paymentLink}" style="display: block; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);">
                Pay Now →
              </a>
            </td>
          </tr>
          ` : ''}
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                Powered by <strong style="color: #6366f1;">Settla</strong> — Fast, secure stablecoin payments
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
Invoice ${data.invoiceNumber} from ${data.businessName}

Amount Due: ${data.amount} ${data.currency}
${data.dueDate ? `Due Date: ${data.dueDate}` : ''}

${data.paymentLink ? `Pay here: ${data.paymentLink}` : ''}

Powered by Settla
  `.trim();

  return { subject, html, text };
}

function generateInvoicePaidEmail(data: InvoiceEmailData) {
  const subject = `✅ Invoice ${data.invoiceNumber} has been paid`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="padding: 40px; text-align: center;">
              <div style="display: inline-flex; align-items: center; justify-content: center; width: 72px; height: 72px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; margin-bottom: 24px;">
                <span style="color: white; font-size: 36px;">✓</span>
              </div>
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1e293b;">Payment Received!</h1>
              <p style="margin: 12px 0 0; color: #64748b; font-size: 16px;">Invoice ${data.invoiceNumber} has been paid</p>
              
              <div style="margin-top: 32px; padding: 24px; background: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0;">
                <p style="margin: 0; color: #166534; font-size: 14px;">Amount Received</p>
                <p style="margin: 8px 0 0; color: #15803d; font-size: 36px; font-weight: 700;">${data.amount} ${data.currency}</p>
              </div>
              
              <p style="margin-top: 24px; color: #94a3b8; font-size: 14px;">
                From: ${data.customerName}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 40px; text-align: center;">
              <a href="#" style="display: inline-block; background: #1e293b; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500;">
                View in Dashboard
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `Payment Received! Invoice ${data.invoiceNumber} has been paid. Amount: ${data.amount} ${data.currency}. From: ${data.customerName}`;

  return { subject, html, text };
}

function generatePaymentReceivedEmail(data: PaymentEmailData) {
  const subject = `💰 Payment received - ${data.amount} ${data.currency}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px;">
          <tr>
            <td style="padding: 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; color: #1e293b;">Payment Received</h1>
              <p style="margin: 24px 0; color: #1e293b; font-size: 48px; font-weight: 700;">${data.amount} ${data.currency}</p>
              <p style="margin: 0; color: #64748b; font-size: 14px;">Transaction: ${data.transactionId}</p>
              ${data.txHash ? `<p style="margin: 8px 0 0;"><a href="${data.explorerUrl}" style="color: #6366f1; text-decoration: none; font-size: 12px;">View on blockchain →</a></p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `Payment received: ${data.amount} ${data.currency}. Transaction: ${data.transactionId}`;

  return { subject, html, text };
}

function generateReceiptEmail(data: ReceiptEmailData) {
  const subject = `Receipt ${data.receiptNumber} from ${data.businessName}`;

  const itemsHtml = data.items.map(item => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #1e293b; font-size: 14px;">${item.description}</p>
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0; color: #64748b; font-size: 14px;">${item.quantity}</p>
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
        <p style="margin: 0; color: #64748b; font-size: 14px;">${item.unitPrice}</p>
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
        <p style="margin: 0; color: #1e293b; font-size: 14px; font-weight: 500;">${item.total}</p>
      </td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px;">
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0; font-size: 24px; color: #1e293b;">Receipt</h1>
              <p style="margin: 8px 0 24px; color: #64748b;">Receipt #${data.receiptNumber}</p>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr style="background: #f8fafc;">
                  <th style="padding: 12px; text-align: left; font-size: 12px; color: #64748b; font-weight: 500;">Item</th>
                  <th style="padding: 12px; text-align: center; font-size: 12px; color: #64748b; font-weight: 500;">Qty</th>
                  <th style="padding: 12px; text-align: right; font-size: 12px; color: #64748b; font-weight: 500;">Price</th>
                  <th style="padding: 12px; text-align: right; font-size: 12px; color: #64748b; font-weight: 500;">Total</th>
                </tr>
                ${itemsHtml}
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                <tr>
                  <td style="text-align: right; padding: 8px 0;">
                    <span style="color: #64748b;">Subtotal:</span>
                    <span style="margin-left: 24px; color: #1e293b;">${data.subtotal}</span>
                  </td>
                </tr>
                ${data.tax ? `
                <tr>
                  <td style="text-align: right; padding: 8px 0;">
                    <span style="color: #64748b;">Tax:</span>
                    <span style="margin-left: 24px; color: #1e293b;">${data.tax}</span>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="text-align: right; padding: 16px 0; border-top: 2px solid #1e293b;">
                    <span style="color: #1e293b; font-weight: 600; font-size: 18px;">Total:</span>
                    <span style="margin-left: 24px; color: #1e293b; font-weight: 700; font-size: 24px;">${data.total} ${data.currency}</span>
                  </td>
                </tr>
              </table>
              
              ${data.pdfUrl ? `
              <div style="margin-top: 32px; text-align: center;">
                <a href="${data.pdfUrl}" style="display: inline-block; background: #1e293b; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px;">
                  Download PDF Receipt
                </a>
              </div>
              ` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `Receipt ${data.receiptNumber}\n\nTotal: ${data.total} ${data.currency}\nDate: ${data.date}\n\nThank you for your payment!`;

  return { subject, html, text };
}

function generateWelcomeEmail(data: BaseEmailData) {
  const subject = `Welcome to Settla! 🎉`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px;">
          <tr>
            <td style="padding: 48px; text-align: center;">
              <div style="display: inline-flex; align-items: center; justify-content: center; width: 80px; height: 80px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 20px; margin-bottom: 24px;">
                <span style="color: white; font-size: 40px; font-weight: bold;">S</span>
              </div>
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #1e293b;">Welcome to Settla!</h1>
              <p style="margin: 16px 0 32px; color: #64748b; font-size: 18px; line-height: 1.6;">
                You're all set to start accepting stablecoin payments from anywhere in the world.
              </p>
              <a href="#" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: 600;">
                Go to Dashboard →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `Welcome to Settla! You're all set to start accepting stablecoin payments.`;

  return { subject, html, text };
}

function generateTeamInviteEmail(data: TeamInviteEmailData) {
  const subject = `You've been invited to join ${data.businessName} on Settla`;
  const greeting = data.inviteeName ? `Hi ${data.inviteeName},` : 'Hi there,';
  const roleDisplay = data.role.charAt(0).toUpperCase() + data.role.slice(1);

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 16px; margin-bottom: 20px;">
                <span style="color: white; font-size: 28px; font-weight: bold;">S</span>
              </div>
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1e293b;">You're Invited! 🎉</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px 32px;">
              <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
                ${greeting}
              </p>
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                <strong>${data.inviterName}</strong> has invited you to join <strong>${data.businessName}</strong> on Settla as a <strong>${roleDisplay}</strong>.
              </p>
              
              <!-- Invitation Card -->
              <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-bottom: 12px;">
                      <p style="margin: 0; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Organization</p>
                      <p style="margin: 4px 0 0; color: #1e293b; font-size: 18px; font-weight: 600;">${data.businessName}</p>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <p style="margin: 0; color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Your Role</p>
                      <p style="margin: 4px 0 0; color: #6366f1; font-size: 16px; font-weight: 600;">${roleDisplay}</p>
                    </td>
                  </tr>
                </table>
              </div>
              
              <p style="margin: 0 0 24px; color: #64748b; font-size: 14px; line-height: 1.6;">
                Settla helps businesses accept instant stablecoin payments from anywhere in the world. Click below to accept your invitation and get started.
              </p>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <a href="${data.inviteLink}" style="display: block; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);">
                Accept Invitation →
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 16px 16px;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.5;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
              <p style="margin: 12px 0 0; color: #94a3b8; font-size: 12px; text-align: center;">
                Powered by <strong style="color: #64748b;">Settla</strong> — Instant Stablecoin Payments
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `${greeting}\n\n${data.inviterName} has invited you to join ${data.businessName} on Settla as a ${roleDisplay}.\n\nAccept your invitation: ${data.inviteLink}\n\nIf you didn't expect this invitation, you can safely ignore this email.`;

  return { subject, html, text };
}

interface DigestEmailData {
  businessName: string;
  periodStart: string;
  periodEnd: string;
  totalRevenue: string;
  transactionCount: string;
  invoicesSent: string;
  invoicesPaid: string;
  topCurrency: string;
  revenueChange: string;
  isPositiveChange: boolean;
}

function generateDigestEmail(data: DigestEmailData) {
  const subject = `📊 Your ${data.businessName} Weekly Digest`;
  const changeIcon = data.isPositiveChange ? '↑' : '↓';
  const changeColor = data.isPositiveChange ? '#10b981' : '#ef4444';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px 16px 0 0;">
              <div style="display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); border-radius: 14px; margin-bottom: 16px;">
                <span style="color: white; font-size: 24px; font-weight: bold;">S</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">Weekly Digest</h1>
              <p style="margin: 8px 0 0; color: #94a3b8; font-size: 14px;">${data.periodStart} - ${data.periodEnd}</p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 24px; color: #334155; font-size: 16px; line-height: 1.5;">
                Hey there! Here's how <strong>${data.businessName}</strong> performed this week.
              </p>
              
              <!-- Revenue Card -->
              <div style="background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); border-radius: 16px; padding: 24px; margin-bottom: 16px;">
                <p style="margin: 0 0 8px; color: rgba(255,255,255,0.8); font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Total Revenue</p>
                <p style="margin: 0; color: #ffffff; font-size: 36px; font-weight: 700;">${data.totalRevenue} ${data.topCurrency}</p>
                <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                  <span style="color: #ffffff;">${changeIcon} ${data.revenueChange}%</span> vs last period
                </p>
              </div>
              
              <!-- Stats Grid -->
              <table width="100%" cellpadding="8" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td width="50%" style="padding: 16px; background-color: #f8fafc; border-radius: 12px;">
                    <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase;">Transactions</p>
                    <p style="margin: 4px 0 0; color: #1e293b; font-size: 24px; font-weight: 600;">${data.transactionCount}</p>
                  </td>
                  <td width="50%" style="padding: 16px; background-color: #f8fafc; border-radius: 12px;">
                    <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase;">Invoices Sent</p>
                    <p style="margin: 4px 0 0; color: #1e293b; font-size: 24px; font-weight: 600;">${data.invoicesSent}</p>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding: 16px; background-color: #f8fafc; border-radius: 12px; margin-top: 8px;">
                    <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase;">Invoices Paid</p>
                    <p style="margin: 4px 0 0; color: #10b981; font-size: 24px; font-weight: 600;">${data.invoicesPaid} / ${data.invoicesSent}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://sera.veridex.io'}/dashboard/analytics" style="display: block; text-align: center; background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: 600;">
                View Full Analytics →
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 16px 16px;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.5;">
                You're receiving this because you've enabled weekly digests. 
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://sera.veridex.io'}/dashboard/settings#notifications" style="color: #64748b;">Manage preferences</a>
              </p>
              <p style="margin: 12px 0 0; color: #94a3b8; font-size: 12px; text-align: center;">
                Powered by <strong style="color: #64748b;">Settla</strong> — Instant Stablecoin Payments
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `Weekly Digest for ${data.businessName}\n\n${data.periodStart} - ${data.periodEnd}\n\nTotal Revenue: ${data.totalRevenue} ${data.topCurrency} (${changeIcon} ${data.revenueChange}%)\nTransactions: ${data.transactionCount}\nInvoices Sent: ${data.invoicesSent}\nInvoices Paid: ${data.invoicesPaid}\n\nView full analytics: ${process.env.NEXT_PUBLIC_APP_URL || 'https://sera.veridex.io'}/dashboard/analytics`;

  return { subject, html, text };
}

