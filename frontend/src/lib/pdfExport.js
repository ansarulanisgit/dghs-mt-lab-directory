import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function formatDDMMYYYY(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    // If already YYYY-MM-DD
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function exportFilteredStaffPDF(staffList, filterContext = {}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const { division, district, upazila, status, totalCount } = filterContext;

  // Determine Title Header
  let scopeTitle = 'ALL BANGLADESH';
  if (district) {
    scopeTitle = `${district.toUpperCase()} DISTRICT`;
  } else if (division) {
    scopeTitle = `${division.toUpperCase()} DIVISION`;
  }

  if (upazila) {
    scopeTitle = `${upazila.toUpperCase()}, ${scopeTitle}`;
  }

  const mainTitle = `MEDICAL TECHNOLOGIST (LAB) — ${scopeTitle}`;
  const subTitle = `Source: Human Resource Information System (HRIS), sorted by PRL Date`;

  // Prepare table rows
  const tableData = staffList.map((item, index) => {
    const isVacant = item.status === 'Vacant' || item.name === '[Vacant Post]';
    return [
      String(index + 1),
      isVacant ? '[Vacant Post]' : (item.name || 'N/A'),
      isVacant ? '-' : (item.hris_id || '-'),
      isVacant ? '-' : (item.contact_info || '-'),
      isVacant ? '-' : formatDDMMYYYY(item.dob),
      item.current_institute || 'DGHS Facility',
      isVacant ? 'Vacant' : formatDDMMYYYY(item.prl_date)
    ];
  });

  // Today's formatted date string: e.g. "28 August, 2026"
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Table Configuration matching the attached reference PDF
  autoTable(doc, {
    head: [[
      'SL',
      'NAME',
      'HRIS ID',
      'CONTACT NO',
      'DOB',
      'INSTITUTE',
      'PRL DATE'
    ]],
    body: tableData,
    startY: 65,
    margin: { top: 70, bottom: 40, left: 25, right: 25 },
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 3.5, right: 3, bottom: 3.5, left: 3 },
      lineColor: [190, 227, 208], // Soft emerald mint border #bee3d0
      lineWidth: 0.5,
      textColor: [15, 23, 42],
      font: 'helvetica'
    },
    headStyles: {
      fillColor: [6, 95, 70], // Deep Emerald Green #065f46
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      fontSize: 8
    },
    alternateRowStyles: {
      fillColor: [240, 253, 244] // Light emerald tint #f0fdf4 (Emerald-50)
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 24 }, // SL
      1: { halign: 'left', cellWidth: 110, fontStyle: 'bold' }, // NAME
      2: { halign: 'center', cellWidth: 46 }, // HRIS ID
      3: { halign: 'center', cellWidth: 70 }, // CONTACT NO
      4: { halign: 'center', cellWidth: 56 }, // DOB
      5: { halign: 'left' }, // INSTITUTE (auto width flex)
      6: { halign: 'center', cellWidth: 58, fontStyle: 'bold', textColor: [6, 95, 70] } // PRL DATE in emerald
    },
    didDrawPage: (data) => {
      const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
      const pageNumber = data.pageNumber;

      // Header on every page in Deep Theme Emerald
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(6, 78, 59); // Emerald-900 #064e3b
      doc.text(mainTitle, pageWidth / 2, 32, { align: 'center' });

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(4, 120, 87); // Emerald-700 #047857
      doc.text(subTitle, pageWidth / 2, 45, { align: 'center' });

      // Bottom emerald rule
      doc.setDrawColor(190, 227, 208);
      doc.setLineWidth(0.6);
      doc.line(25, pageHeight - 25, pageWidth - 25, pageHeight - 25);

      // Footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const footerLeft = `Date Created: ${dateStr} | Data Collected and Formated By Ansarul Anis.`;
      const footerRight = `Page ${pageNumber}`;
      doc.text(footerLeft, 25, pageHeight - 14);
      doc.text(footerRight, pageWidth - 25, pageHeight - 14, { align: 'right' });
    }
  });

  // Clean filename: e.g. "MT_Lab_Rajshahi_District_2026-08-28.pdf"
  const safeScope = (district || division || 'All_Bangladesh').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `DGHS_MT_Lab_${safeScope}_${today.toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}