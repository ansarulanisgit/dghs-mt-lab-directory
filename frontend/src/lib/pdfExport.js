import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getPdfColumnsConfig, AVAILABLE_PDF_COLUMNS } from './pdfConfigStore';

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

// Column value extractors and styling definitions
const COLUMN_HANDLERS = {
  sl: {
    label: 'SL',
    extract: (item, index) => String(index + 1),
    style: { halign: 'center', cellWidth: 24 }
  },
  post_id: {
    label: 'POST ID',
    extract: (item) => item.post_id || '-',
    style: { halign: 'center', cellWidth: 46, fontStyle: 'bold' }
  },
  name: {
    label: 'NAME',
    extract: (item, index, isAbolished, isVacant) => 
      isAbolished ? '[Abolished Post]' : isVacant ? '[Vacant Post]' : (item.name || 'N/A'),
    style: { halign: 'left', cellWidth: 120, fontStyle: 'bold' }
  },
  designation: {
    label: 'DESIGNATION',
    extract: (item) => item.designation || 'Medical Technologist',
    style: { halign: 'left', cellWidth: 110 }
  },
  status: {
    label: 'STATUS',
    extract: (item) => item.status || 'Vacant',
    style: { halign: 'center', cellWidth: 46, fontStyle: 'bold' }
  },
  hris_id: {
    label: 'HRIS ID',
    extract: (item, index, isAbolished, isVacant, isFilled) => 
      isFilled ? (item.hris_id || '-') : '-',
    style: { halign: 'center', cellWidth: 50 }
  },
  contact_no: {
    label: 'CONTACT NO',
    extract: (item, index, isAbolished, isVacant, isFilled) => 
      isFilled ? (item.contact_info || '-') : '-',
    style: { halign: 'center', cellWidth: 68 }
  },
  nid: {
    label: 'NID',
    extract: (item, index, isAbolished, isVacant, isFilled) => 
      isFilled ? (item.nid || item.national_id || '-') : '-',
    style: { halign: 'center', cellWidth: 68 }
  },
  address: {
    label: 'ADDRESS',
    extract: (item) => 
      [item.upazila, item.district, item.division].filter(Boolean).join(', ') || item.address || '-',
    style: { halign: 'left', cellWidth: 90 }
  },
  institute: {
    label: 'INSTITUTE / FACILITY',
    extract: (item) => item.current_institute || 'DGHS Facility',
    style: { halign: 'left' } // Flex width
  },
  prl_date: {
    label: 'PRL DATE',
    extract: (item, index, isAbolished, isVacant, isFilled) => 
      isFilled ? formatDDMMYYYY(item.prl_date) : '-',
    style: { halign: 'center', cellWidth: 58, fontStyle: 'bold', textColor: [6, 95, 70] }
  }
};

export async function exportFilteredStaffPDF(staffList, filterContext = {}) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  });

  const { division, district, upazila, status, designationGroups, disciplines, majorDisciplines, designations } = filterContext;
  const activeDisciplines = disciplines || majorDisciplines || [];

  // Active columns configuration
  const currentConfig = filterContext.pdfColumnsConfig || getPdfColumnsConfig();
  const selectedIds = (currentConfig.selectedColumns && currentConfig.selectedColumns.length > 0)
    ? currentConfig.selectedColumns
    : ['sl', 'post_id', 'name', 'designation', 'status', 'hris_id', 'contact_no', 'institute', 'prl_date'];

  const order = (currentConfig.columnOrder && currentConfig.columnOrder.length > 0)
    ? currentConfig.columnOrder
    : AVAILABLE_PDF_COLUMNS.map(c => c.id);

  const columnsById = {};
  AVAILABLE_PDF_COLUMNS.forEach(col => {
    columnsById[col.id] = col;
  });

  // Filter and order active columns according to user's custom arranged order
  const activeColumns = order
    .filter(id => selectedIds.includes(id) && columnsById[id])
    .map(id => columnsById[id]);

  const effectiveColumns = activeColumns.length > 0 ? activeColumns : AVAILABLE_PDF_COLUMNS;

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

  const baseHeaderTitle = (currentConfig.headerTitleText !== undefined && currentConfig.headerTitleText !== null)
    ? String(currentConfig.headerTitleText).trim()
    : 'DGHS DIRECTORY';

  const appendScope = currentConfig.appendFilterScopeToTitle !== false;

  let mainTitle = baseHeaderTitle;
  if (appendScope) {
    let filterSuffix = '';
    if (designations && designations.length > 0) {
      filterSuffix = designations.join(', ').toUpperCase();
    } else if (activeDisciplines && activeDisciplines.length > 0) {
      filterSuffix = activeDisciplines.join(', ').toUpperCase();
    } else if (designationGroups && designationGroups.length > 0) {
      filterSuffix = designationGroups.join(', ').toUpperCase();
    }

    if (filterSuffix) {
      mainTitle = baseHeaderTitle ? `${baseHeaderTitle} — ${filterSuffix} (${scopeTitle})` : `${filterSuffix} (${scopeTitle})`;
    } else {
      const effectiveBase = baseHeaderTitle === 'DGHS DIRECTORY' ? 'DGHS EMPLOYEE DIRECTORY' : baseHeaderTitle;
      mainTitle = effectiveBase ? `${effectiveBase} (${scopeTitle})` : `(${scopeTitle})`;
    }
  }

  const showHeaderTitle = currentConfig.showHeaderTitle !== false && Boolean(mainTitle.trim());
  const showRecordCount = currentConfig.showRecordCount !== false;
  const showHeaderSource = currentConfig.showHeaderSource !== false;
  const customSourceText = (currentConfig.headerSourceText !== undefined && currentConfig.headerSourceText !== null)
    ? String(currentConfig.headerSourceText).trim()
    : 'Source: DGHS Human Resource Management System (HRIS)';

  const subTitleParts = [];
  if (showRecordCount) {
    subTitleParts.push(`Total Filtered Records: ${staffList.length}`);
  }
  if (showHeaderSource && customSourceText) {
    subTitleParts.push(customSourceText);
  }
  const subTitle = subTitleParts.join(' | ');
  const showSubTitle = subTitleParts.length > 0;
  const showGeneratedDate = currentConfig.showGeneratedDate !== false;

  const customFooterText = (currentConfig.footerText !== undefined && currentConfig.footerText !== null)
    ? String(currentConfig.footerText).trim()
    : 'DGHS Employee Directory - Developed By Ansarul Anis';
  const showFooterText = currentConfig.showFooterText !== false && Boolean(customFooterText);
  const showPageNumbers = currentConfig.showPageNumbers !== false;

  const hasSubRow = showSubTitle || showGeneratedDate;
  const hasAnyHeader = showHeaderTitle || hasSubRow;
  const hasAnyFooter = showFooterText || showPageNumbers;

  const topMargin = !hasAnyHeader ? 22 : (showHeaderTitle && hasSubRow ? 60 : 44);
  const startY = !hasAnyHeader ? 22 : (showHeaderTitle && hasSubRow ? 58 : 42);
  const bottomMargin = hasAnyFooter ? 35 : 20;

  // Prepare table headers
  const tableHeaders = effectiveColumns.map(col => col.label);

  // Prepare table rows dynamically based on enabled columns
  const tableData = staffList.map((item, index) => {
    const isAbolished = item.status === 'Abolished' || item.name === '[Abolished Post]';
    const isVacant = !isAbolished && (item.status === 'Vacant' || item.name === '[Vacant Post]');
    const isFilled = !isAbolished && !isVacant;

    return effectiveColumns.map(col => {
      const handler = COLUMN_HANDLERS[col.id];
      if (handler && typeof handler.extract === 'function') {
        return handler.extract(item, index, isAbolished, isVacant, isFilled);
      }
      return item[col.id] || '-';
    });
  });

  // Dynamic Column Styles
  const columnStyles = {};
  effectiveColumns.forEach((col, idx) => {
    const handler = COLUMN_HANDLERS[col.id];
    if (handler && handler.style) {
      columnStyles[idx] = handler.style;
    }
  });

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY,
    margin: { top: topMargin, bottom: bottomMargin, left: 20, right: 20 },
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
    columnStyles,
    didDrawPage: (data) => {
      const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
      const pageNumber = data.pageNumber;

      // Render Header if enabled
      if (hasAnyHeader) {
        if (showHeaderTitle) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(6, 95, 70); // Deep Emerald text
          doc.text(mainTitle, 20, 24);
        }

        const subRowY = showHeaderTitle ? 38 : 24;

        if (showSubTitle) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139); // Slate-500
          doc.text(subTitle, 20, subRowY);
        }

        if (showGeneratedDate) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(`Generated: ${dateStr}`, pageWidth - 20, subRowY, { align: 'right' });
        }

        const lineY = (showHeaderTitle && hasSubRow) ? 46 : 32;
        doc.setDrawColor(226, 232, 240); // Slate-200
        doc.line(20, lineY, pageWidth - 20, lineY);
      }

      // Render Footer if enabled
      if (hasAnyFooter) {
        doc.setDrawColor(226, 232, 240);
        doc.line(20, pageHeight - 22, pageWidth - 20, pageHeight - 22);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        if (showFooterText) {
          doc.text(customFooterText, 20, pageHeight - 10);
        }
        if (showPageNumbers) {
          doc.text(`Page ${pageNumber}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
        }
      }
    }
  });

  // Filename formatting
  const sanitizedScope = scopeTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `dghs_employee_directory_${sanitizedScope}_${today.toISOString().split('T')[0]}.pdf`;

  // Detect mobile device or Android WebView
  const isMobileOrWebView = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || '');

  try {
    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

    // 1. If Web Share API is available on mobile/WebView, trigger native Android Share / Save Sheet
    if (isMobileOrWebView && typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: 'DGHS Directory PDF Report',
          text: `DGHS Employee Directory PDF Report (${scopeTitle})`
        });
        return;
      } catch (shareErr) {
        if (shareErr?.name === 'AbortError') {
          // User closed share dialog
          return;
        }
        console.warn('Native share failed, falling back to download:', shareErr);
      }
    }

    // 2. Standard browser download fallback
    doc.save(filename);
  } catch (err) {
    console.warn('Custom blob save failed, attempting standard doc.save:', err);
    doc.save(filename);
  }
}