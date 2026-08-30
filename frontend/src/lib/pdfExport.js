import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function formatDDMMYYYY(dateStr) {
  if (!dateStr) return '-';
  try {
    const parts = String(dateStr).split('T')[0].split('-');
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
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  });

  const { division, district, upazila, status, designationGroups, disciplines, majorDisciplines, designations } = filterContext;
  const activeDisciplines = disciplines || majorDisciplines || [];

  // Determine Scope Title
  let scopeTitle = 'ALL BANGLADESH';
  if (district) {
    scopeTitle = `${district.toUpperCase()} DISTRICT`;
  } else if (division) {
    scopeTitle = `${division.toUpperCase()} DIVISION`;
  }

  if (upazila) {
    scopeTitle = `${upazila.toUpperCase()}, ${scopeTitle}`;
  }

  let groupTitle = 'DGHS EMPLOYEE DIRECTORY';
  if (designations && designations.length > 0) {
    groupTitle = `DGHS DIRECTORY — ${designations.join(', ').toUpperCase()}`;
  } else if (activeDisciplines && activeDisciplines.length > 0) {
    groupTitle = `DGHS DIRECTORY — ${activeDisciplines.join(', ').toUpperCase()}`;
  } else if (designationGroups && designationGroups.length > 0) {
    groupTitle = `DGHS DIRECTORY — ${designationGroups.join(', ').toUpperCase()}`;
  }

  const mainTitle = `${groupTitle} (${scopeTitle})`;
  const subTitle = `Total Filtered Records: ${staffList.length} | Source: DGHS Human Resource Management System (HRIS)`;

  // Prepare table rows (Discipline & Location removed)
  const tableData = staffList.map((item, index) => {
    const isAbolished = item.status === 'Abolished' || item.name === '[Abolished Post]';
    const isVacant = !isAbolished && (item.status === 'Vacant' || item.name === '[Vacant Post]');
    const isFilled = !isAbolished && !isVacant;

    return [
      String(index + 1),
      item.post_id || '-',
      isAbolished ? '[Abolished Post]' : isVacant ? '[Vacant Post]' : (item.name || 'N/A'),
      item.designation || 'Medical Technologist',
      item.status || 'Vacant',
      isFilled ? (item.hris_id || '-') : '-',
      isFilled ? (item.contact_info || '-') : '-',
      item.current_institute || 'DGHS Facility',
      isFilled ? formatDDMMYYYY(item.prl_date) : '-'
    ];
  });

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  autoTable(doc, {
    head: [[
      'SL',
      'POST ID',
      'PERSONNEL NAME',
      'DESIGNATION',
      'STATUS',
      'HRIS ID',
      'CONTACT NO',
      'INSTITUTE / FACILITY',
      'PRL DATE'
    ]],
    body: tableData,
    startY: 58,
    margin: { top: 60, bottom: 35, left: 20, right: 20 },
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: { top: 3.5, right: 3, bottom: 3.5, left: 3 },
      lineColor: [190, 227, 208], // Soft emerald mint border
      lineWidth: 0.5,
      textColor: [15, 23, 42],
      font: 'helvetica'
    },
    headStyles: {
      fillColor: [6, 95, 70], // Deep Emerald Green for table header only
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      fontSize: 8
    },
    alternateRowStyles: {
      fillColor: [240, 253, 244] // Emerald-50 tint
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 24 }, // SL
      1: { halign: 'center', cellWidth: 48, fontStyle: 'bold' }, // POST ID
      2: { halign: 'left', cellWidth: 140, fontStyle: 'bold' }, // NAME
      3: { halign: 'left', cellWidth: 140 }, // DESIGNATION
      4: { halign: 'center', cellWidth: 48, fontStyle: 'bold' }, // STATUS
      5: { halign: 'center', cellWidth: 54 }, // HRIS
      6: { halign: 'center', cellWidth: 70 }, // PHONE
      7: { halign: 'left' }, // INSTITUTE (auto flex)
      8: { halign: 'center', cellWidth: 62, fontStyle: 'bold', textColor: [6, 95, 70] } // PRL DATE
    },
    didDrawPage: (data) => {
      const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
      const pageNumber = data.pageNumber;

      // Top Title Text (Clean Emerald Text on White Background)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(6, 95, 70); // Deep Emerald text
      doc.text(mainTitle, 20, 24);

      // Subtitle & Metadata
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text(subTitle, 20, 38);

      // Generated Date on Top Right
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${dateStr}`, pageWidth - 20, 38, { align: 'right' });

      // Header Separator Line
      doc.setDrawColor(226, 232, 240); // Slate-200
      doc.line(20, 46, pageWidth - 20, 46);

      // Footer
      doc.setDrawColor(226, 232, 240);
      doc.line(20, pageHeight - 22, pageWidth - 20, pageHeight - 22);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('DGHS Employee Directory - Developed By Ansarul Anis', 20, pageHeight - 10);
      doc.text(`Page ${pageNumber}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
    }
  });

  // Filename formatting
  const sanitizedScope = scopeTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `dghs_employee_directory_${sanitizedScope}_${today.toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}