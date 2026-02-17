import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportData {
  full_name: string;
  type: string;
  timestamp: string;
  location: string;
  method: string;
  status: string;
}

/**
 * Export logs to Excel format
 */
export const exportToExcel = (data: ExportData[], fileName: string = 'Relatorio_Picagens') => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Picagens');
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

/**
 * Export logs to PDF format with premium look
 */
export const exportToPDF = (data: ExportData[], title: string = 'Relatório de Picagens') => {
  const doc = new jsPDF();
  
  // Header
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(0, 229, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('CHRONOS PRO', 14, 20);
  
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(10);
  doc.text(title.toUpperCase(), 14, 30);
  doc.text(`GERADO EM: ${new Date().toLocaleString('pt-PT')}`, 140, 30);

  // Table
  const tableRows = data.map(item => [
    item.full_name,
    item.type.toUpperCase(),
    new Date(item.timestamp).toLocaleString('pt-PT'),
    item.location,
    item.method.toUpperCase(),
    item.status.toUpperCase()
  ]);

  autoTable(doc, {
    startY: 50,
    head: [['Funcionário', 'Tipo', 'Data/Hora', 'Local', 'Método', 'Status']],
    body: tableRows,
    theme: 'striped',
    headStyles: { 
      fillColor: [0, 229, 255], 
      textColor: [0, 0, 0],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    styles: {
      fontSize: 9,
      cellPadding: 4
    }
  });

  doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
};
