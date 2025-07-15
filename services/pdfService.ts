
import { User, FinancialItem, Payment, ItemType, InvoiceDetails, BankAccount } from './types';

// Extend the Window interface to include jsPDF and QRCode
declare global {
  interface Window {
    jspdf: any;
    QRCode: any;
  }
}

export const generateReceiptPDF = (user: User, item: FinancialItem, payment: Payment, outputType: 'download' | 'dataurl' = 'download'): string | void => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Finovate', 20, 20);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Recibo de Pago', 20, 30);

  // User Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('De:', 20, 45);
  doc.setFont('helvetica', 'normal');
  doc.text(user.name, 20, 50);
  doc.text(user.email, 20, 55);
  doc.text(user.phone, 20, 60);

  // Debtor/Payer Info
  doc.setFont('helvetica', 'bold');
  doc.text('Para:', 140, 45);
  doc.setFont('helvetica', 'normal');
  doc.text(item.personName, 140, 50);
  if (item.personId) {
    doc.text(`ID: ${item.personId}`, 140, 55);
  }

  // Line separator
  doc.setLineWidth(0.5);
  doc.line(20, 70, 190, 70);

  // Payment Details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalles del Pago', 20, 80);

  let detailStartY = 90;
  const detailRowHeight = 7;
  
  const addDetailRow = (label: string, value: string, y: number) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 80, y);
  };
  
  addDetailRow('ID del Recibo:', payment.id.substring(0, 18), detailStartY);
  addDetailRow('Fecha de Pago:', new Date(payment.date).toLocaleString('es-ES'), detailStartY += detailRowHeight);
  addDetailRow('Método de Pago:', payment.method, detailStartY += detailRowHeight);
  addDetailRow('Tipo de Ítem:', item.type, detailStartY += detailRowHeight);
  addDetailRow('Descripción:', item.description, detailStartY += detailRowHeight);
  
  if (item.type === 'Préstamo' && payment.allocation) {
    const allocationText = payment.allocation === 'capital' ? 'Abono a Capital' : 'Pago de Intereses';
    addDetailRow('Concepto:', allocationText, detailStartY += detailRowHeight);
  }

  // Line separator
  doc.setLineWidth(0.2);
  doc.line(20, 140, 190, 140);
  
  // Amount
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Monto Pagado:', 130, 150, { align: 'right' });
  doc.setFontSize(20);
  doc.text(`$${payment.amount.toFixed(2)}`, 185, 150, { align: 'right' });

  // Footer
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text(`Gracias por su pago. Este recibo fue generado el ${new Date().toLocaleDateString('es-ES')}.`, 20, 280);

  // Save or View the PDF
  if (outputType === 'dataurl') {
    return doc.output('datauristring');
  } else {
    doc.save(`Finovate-Recibo-${payment.id}.pdf`);
  }
};

export const generateLoanStatementPDF = (user: User, item: FinancialItem, outputType: 'download' | 'dataurl' = 'download'): string | void => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Finovate', 20, 20);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text('Estado de Cuenta', 20, 30);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, pageW - 20, 20, { align: 'right' });

    // Loan & Parties Info
    doc.setLineWidth(0.5);
    doc.line(20, 40, pageW - 20, 40);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Acreedor (Prestador)', 20, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(user.name, 20, 56);
    doc.text(user.email, 20, 61);

    doc.setFont('helvetica', 'bold');
    doc.text('Deudor', pageW / 2, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(item.personName, pageW / 2, 56);
    if(item.personId) doc.text(`ID: ${item.personId}`, pageW / 2, 61);
    if(item.personPhone) doc.text(`Tel: ${item.personPhone}`, pageW / 2, 66);
    
    doc.line(20, 75, pageW - 20, 75);

    // Loan Summary
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen del Crédito', 20, 85);
    
    const capitalPaid = item.payments.filter(p => p.allocation === 'capital').reduce((sum, p) => sum + p.amount, 0);
    const interestPaid = item.payments.filter(p => p.allocation === 'interes').reduce((sum, p) => sum + p.amount, 0);
    const totalPaid = capitalPaid + interestPaid;
    const balance = (item.principal || 0) - capitalPaid;
    
    const summaryData = [
        ['Monto Principal:', `$${(item.principal || 0).toFixed(2)}`, 'Total Pagado:', `$${totalPaid.toFixed(2)}`],
        ['Tasa de Interés:', `${item.interestRate || 0}%`, 'Saldo de Capital:', `$${balance.toFixed(2)}`],
        ['Plazo:', `${item.term}`, 'Capital Pagado:', `$${capitalPaid.toFixed(2)}`],
        ['Fecha de Inicio:', `${new Date(item.startDate).toLocaleDateString('es-ES')}`, 'Intereses Pagados:', `$${interestPaid.toFixed(2)}`]
    ];

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let startY = 92;
    summaryData.forEach(row => {
        doc.setFont('helvetica', 'bold');
        doc.text(row[0], 22, startY);
        doc.setFont('helvetica', 'normal');
        doc.text(row[1], 60, startY);

        doc.setFont('helvetica', 'bold');
        doc.text(row[2], pageW / 2, startY);
        doc.setFont('helvetica', 'normal');
        doc.text(row[3], pageW / 2 + 40, startY);
        startY += 6;
    });

    // Transaction History
    doc.line(20, startY + 5, pageW - 20, startY + 5);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Historial de Transacciones', 20, startY + 12);
    
    // Table Header
    let tableY = startY + 20;
    const head = [['Fecha', 'Descripción', 'Monto', 'Saldo Capital']];
    const body = [];
    let currentBalance = item.principal || 0;

    body.push([new Date(item.startDate).toLocaleDateString('es-ES'), 'Monto inicial del préstamo', `$${(item.principal || 0).toFixed(2)}`, `$${currentBalance.toFixed(2)}`]);
    
    [...item.payments].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(p => {
        if(p.allocation === 'capital') currentBalance -= p.amount;
        const desc = p.allocation === 'capital' ? 'Abono a Capital' : 'Pago de Intereses';
        body.push([new Date(p.date).toLocaleDateString('es-ES'), desc, `$${p.amount.toFixed(2)}`, `$${currentBalance.toFixed(2)}`]);
    });

    // Simple table renderer
    const drawTable = (header: string[][], data: string[][], startY: number) => {
        const colWidths = [35, 70, 35, 35];
        const rowHeight = 8;
        let x = 20;
        let y = startY;

        // Header
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(230, 230, 230);
        doc.rect(x, y, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
        header[0].forEach((cell, i) => {
            doc.text(cell, x + 2, y + rowHeight - 3);
            x += colWidths[i];
        });
        y += rowHeight;

        // Body
        doc.setFont('helvetica', 'normal');
        data.forEach(row => {
            x = 20;
            if (y > 270) { // Page break
                doc.addPage();
                y = 20;
            }
            row.forEach((cell, i) => {
                doc.text(cell, x + 2, y + rowHeight - 3);
                x += colWidths[i];
            });
            y += rowHeight;
        });
    }

    drawTable(head, body, tableY);

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Finovate - Tu asistente financiero personal.`, 20, 285);
    
    if (outputType === 'dataurl') {
        return doc.output('datauristring');
    } else {
        doc.save(`EstadoDeCuenta-${item.personName.replace(' ','_')}-${item.id}.pdf`);
    }
};


export const generateInvoicePDF = (
    user: User, 
    item: FinancialItem, 
    invoiceDetails: InvoiceDetails, 
    bankAccounts: BankAccount[],
    qrCodeDataUrl?: string,
    outputType: 'download' | 'dataurl' = 'download'
): string | void => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const invoiceId = crypto.randomUUID().substring(0, 8).toUpperCase();

    // Header
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURA DE COBRO', pageW / 2, 25, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Factura #${invoiceId}`, pageW - 20, 35, { align: 'right' });
    doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-ES')}`, pageW - 20, 40, { align: 'right' });
    doc.text(`Fecha de Vencimiento: ${new Date(invoiceDetails.dueDate).toLocaleDateString('es-ES')}`, pageW - 20, 45, { align: 'right' });

    // Parties Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('De (Acreedor):', 20, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(user.name, 20, 56);
    doc.text(user.address, 20, 61);
    doc.text(user.email, 20, 66);
    if(user.idDocument) doc.text(`ID: ${user.idDocument}`, 20, 71);

    doc.setFont('helvetica', 'bold');
    doc.text('Para (Deudor):', 110, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(item.personName, 110, 56);
    if(item.personId) doc.text(`ID: ${item.personId}`, 110, 61);
    if(item.personPhone) doc.text(`Tel: ${item.personPhone}`, 110, 66);

    // Invoice Table
    let tableY = 90;
    doc.setLineWidth(0.5);
    doc.line(20, tableY - 5, pageW - 20, tableY - 5);
    
    // Table Header
    doc.setFont('helvetica', 'bold');
    doc.text('Concepto', 22, tableY);
    doc.text('Monto', pageW - 22, tableY, { align: 'right' });
    doc.line(20, tableY + 2, pageW - 20, tableY + 2);
    
    // Table Body
    tableY += 10;
    doc.setFont('helvetica', 'normal');
    doc.text(invoiceDetails.concept, 22, tableY);
    doc.text(`$${invoiceDetails.amount.toFixed(2)}`, pageW - 22, tableY, { align: 'right' });
    
    // Total
    tableY += 20;
    doc.setLineWidth(0.5);
    doc.line(pageW / 2, tableY, pageW - 20, tableY);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL A PAGAR:', pageW / 2 + 2, tableY + 8);
    doc.setFontSize(18);
    doc.text(`$${invoiceDetails.amount.toFixed(2)}`, pageW - 22, tableY + 8, { align: 'right' });

    // Payment Information
    let paymentInfoY = tableY + 40;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Información de Pago', 20, paymentInfoY);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    paymentInfoY += 8;

    if (bankAccounts.length > 0) {
        bankAccounts.forEach(acc => {
            doc.text(`- Banco: ${acc.bankName}, Cuenta: ${acc.accountName}`, 22, paymentInfoY);
            paymentInfoY += 6;
        });
    } else {
        doc.text('No hay cuentas bancarias configuradas.', 22, paymentInfoY);
        paymentInfoY += 6;
    }
    
    if (qrCodeDataUrl) {
      doc.setFont('helvetica', 'bold');
      doc.text('Escanear para Pagar:', 110, paymentInfoY - 20);
      doc.addImage(qrCodeDataUrl, 'PNG', 110, paymentInfoY - 15, 50, 50);
    }
    
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('Gracias por su negocio.', pageW / 2, 280, { align: 'center' });
    doc.text(`Finovate | ${user.name} | ${user.email}`, pageW / 2, 285, { align: 'center' });

    if (outputType === 'dataurl') {
        return doc.output('datauristring');
    } else {
        doc.save(`Factura-${item.personName.replace(' ', '_')}-${invoiceId}.pdf`);
    }
};
