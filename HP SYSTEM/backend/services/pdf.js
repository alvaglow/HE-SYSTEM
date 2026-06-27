const htmlPdf = require("html-pdf-node");

const generateHtmlTemplate = (content, title) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 40px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #4CAF50;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #4CAF50;
          margin-bottom: 5px;
        }
        .title {
          font-size: 18px;
          color: #666;
        }
        .content {
          margin-top: 30px;
        }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          text-align: center;
          font-size: 12px;
          color: #999;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        th {
          background-color: #f8f8f8;
          font-weight: bold;
        }
        .status-paid {
          color: #4CAF50;
          font-weight: bold;
        }
        .status-pending {
          color: #FF9800;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">HED SYSTEM</div>
        <div class="title">${title}</div>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        <p>HED System - Documents for Harmonic Patterns</p>
      </div>
    </body>
    </html>
  `;
};

const generateInvoicePDF = async (invoiceData) => {
  try {
    if (!invoiceData.invoiceId || !invoiceData.studentName) {
      throw new Error("Invoice ID and student name are required");
    }

    const invoiceContent = `
      <div style="margin-bottom: 20px;">
        <table>
          <tr>
            <td><strong>Invoice #:</strong></td>
            <td>${invoiceData.invoiceId}</td>
          </tr>
          <tr>
            <td><strong>Date:</strong></td>
            <td>${new Date().toLocaleDateString()}</td>
          </tr>
          <tr>
            <td><strong>Due Date:</strong></td>
            <td>${new Date(invoiceData.dueDate).toLocaleDateString()}</td>
          </tr>
       461179 Length of Data
          <tr>
            <td><strong>Status:</strong></td>
            <td class="${invoiceData.status === 'paid' ? 'status-paid' : 'status-pending'}">
              ${invoiceData.status.toUpperCase()}
            </td>
          </tr>
        </table>
      </div>
      <h3>Bill To:</h3>
      <p>${invoiceData.studentName}</p>
      <p>${invoiceData.email || 'N/A'}</p>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Tuition Fee</td>
            <td>$${invoiceData.amount}</td>
          </tr>
        </tbody>
        <tfoot style="font-weight: bold; border-top: 2px solid #333;">
          <tr>
            <td>Total</td>
            <td>$${invoiceData.amount}</td>
          </tr>
        </tfoot>
      </table>
    `;

    const html = generateHtmlTemplate(invoiceContent, "Invoice");

    const options = {
      format: "A4",
      printBackground: true,
    };

    const file = { content: html };
    const pdfBuffer = await htmlPdf.generatePdf(file, options);

    return { success: true, pdfBuffer };
  } catch (error) {
    console.error("Error generating invoice PDF:", error.message);
    return { success: false, error: error.message };
  }
};

const generateAttendanceReport = async (attendanceData) => {
  try {
    if (!Array.isArray(attendanceData.records)) {
      throw new Error("Invalid attendance data. Expected an array of records.");
    }

    const totalRecords = attendanceData.records.length;
    const presentCount = attendanceData.records.filter(
      (r) => r.status === "present"
    ).length;
    const absentCount = totalRecords - presentCount;
    const attendancePercent = totalRecords > 0 
      ? ((presentCount / totalRecords) * 100).toFixed(1) 
      : 0;

    const recordRows = attendanceData.records
      .map(
        (record) => `
        <tr>
          <td>${new Date(record.date).toLocaleDateString()}</td>
          <td>${record.studentName}</td>
          <td class="${record.status === 'present' ? 'status-paid' : 'status-pending'}">
            ${record.status.toUpperCase()}
          </td>
        </tr>
      `
      )
      .join("");

    const reportContent = `
      <div style="margin-bottom: 20px;">
        <h3>Attendance Summary</h3>
        <table>
          <tr>
            <td><strong>Student:</strong></td>
            <td>${attendanceData.studentName}</td>
          </tr>
          <tr>
            <td><strong>Class:</strong></td>
            <td>${attendanceData.className}</td>
          </tr>
          <tr>
            <td><strong>Period:</strong></td>
            <td>${new Date(attendanceData.startDate).toLocaleDateString()} - ${new Date(attendanceData.endDate).toLocaleDateString()}</td>
          </tr>
        </table>
      </div>
      <h3>Records</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Student</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${recordRows}
        </tbody>
      </table>
      <div style="margin-top: 30px; padding: 20px; background-color: #f8f8f8; border-radius: 5px;">
        <h3>Summary Statistics</h3>
        <p><strong>Total Days:</strong> ${totalRecords}</p>
        <p><strong>Present:</strong> ${presentCount} (${((presentCount/totalRecords)*100).toFixed(1)}%)</p>
        <p><strong>Absent:</strong> ${absentCount} (${((absentCount/totalRecords)*100).toFixed(1)}%)</p>
        <p><strong>Attendance Rate:</strong> ${attendancePercent}%</p>
      </div>
    `;

    const html = generateHtmlTemplate(reportContent, "Attendance Report");

    const options = {
      format: "A4",
      printBackground: true,
    };

    const file = { content: html };
    const pdfBuffer = await htmlPdf.generatePdf(file, options);

    return { success: true, pdfBuffer };
  } catch (error) {
    console.error("Error generating attendance report:", error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  generateInvoicePDF,
  generateAttendanceReport,
};
