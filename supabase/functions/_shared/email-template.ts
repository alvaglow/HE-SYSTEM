// HE-SYSTEM shared Edge Function helper: HTML email templates
// Ported from archive/HP SYSTEM/backend/services/pdf.js and services/email.js.
// The original generated actual PDF binaries via html-pdf-node (Puppeteer/Chromium),
// which cannot run in a Supabase Edge Function (no headless-browser runtime,
// tight size/time limits). This keeps the same visual template but renders it
// as an HTML email body instead of a PDF file — invoice-generate and the
// payment gateway functions use this for the receipt/invoice email.
//
// If a real downloadable PDF is ever needed, it belongs in a separate service
// (e.g. a small Node/Vercel function using a headless-browser PDF library) —
// not in this edge function runtime.
//
// Import from another function with: import { invoiceEmailHtml } from '../_shared/email-template.ts'

function wrap(title: string, content: string) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 32px; color: #0F172A; }
  .header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #1B3D8C; }
  .logo { font-size: 22px; font-weight: 700; color: #1B3D8C; margin-bottom: 4px; }
  .title { font-size: 16px; color: #666; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
  th { background-color: #f8f8f8; font-weight: 600; }
  .status-paid { color: #16a34a; font-weight: 700; }
  .status-pending { color: #F59E0B; font-weight: 700; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">HE-SYSTEM</div>
    <div class="title">${title}</div>
  </div>
  <div class="content">${content}</div>
  <div class="footer"><p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p></div>
</body>
</html>`
}

export function invoiceEmailHtml(invoice: {
  invoiceNumber: string
  studentName: string
  email?: string
  amount: number
  currency: string
  dueDate: string
  status: string
  description?: string
}) {
  const content = `
    <table>
      <tr><td><strong>Invoice #:</strong></td><td>${invoice.invoiceNumber}</td></tr>
      <tr><td><strong>Date:</strong></td><td>${new Date().toLocaleDateString()}</td></tr>
      <tr><td><strong>Due Date:</strong></td><td>${new Date(invoice.dueDate).toLocaleDateString()}</td></tr>
      <tr><td><strong>Status:</strong></td><td class="${invoice.status === 'paid' ? 'status-paid' : 'status-pending'}">${invoice.status.toUpperCase()}</td></tr>
    </table>
    <h3>Bill To</h3>
    <p>${invoice.studentName}${invoice.email ? `<br>${invoice.email}` : ''}</p>
    <table>
      <thead><tr><th>Description</th><th>Amount</th></tr></thead>
      <tbody><tr><td>${invoice.description ?? 'Tuition fee'}</td><td>${invoice.amount.toLocaleString()} ${invoice.currency}</td></tr></tbody>
      <tfoot><tr style="font-weight:700;border-top:2px solid #333;"><td>Total</td><td>${invoice.amount.toLocaleString()} ${invoice.currency}</td></tr></tfoot>
    </table>
  `
  return wrap('Invoice', content)
}

export function paymentReceiptEmailHtml(payment: { invoiceNumber: string; amount: number; currency: string; gateway: string; date: string }) {
  const content = `
    <p>Thank you for your payment!</p>
    <table>
      <tr><td><strong>Invoice #</strong></td><td>${payment.invoiceNumber}</td></tr>
      <tr><td><strong>Amount</strong></td><td>${payment.amount.toLocaleString()} ${payment.currency}</td></tr>
      <tr><td><strong>Method</strong></td><td>${payment.gateway.toUpperCase()}</td></tr>
      <tr><td><strong>Date</strong></td><td>${new Date(payment.date).toLocaleString()}</td></tr>
    </table>
  `
  return wrap('Payment Receipt', content)
}
