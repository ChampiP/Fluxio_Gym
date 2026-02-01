import { jsPDF } from "jspdf";
import { AppSettings, Transaction, Client } from "../types";

// Helper for "SON: X SOLES" (Simplificado para números enteros y decimales)
const numberToWords = (amount: number): string => {
    const integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 100);
    const decimalStr = decimalPart < 10 ? `0${decimalPart}` : `${decimalPart}`;
    
    // Nota: En un entorno de producción real, se recomienda usar una librería completa 
    // para convertir cualquier número a texto (ej. 'veinticinco'). 
    // Para efectos de este archivo único, usamos el formato numérico-legal válido.
    return `SON: ${integerPart} CON ${decimalStr}/100 SOLES`;
};

export const generateInvoice = (transaction: Transaction, settings: AppSettings, client?: Client | null) => {
  const doc = new jsPDF();
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 12;
  
  // --- CONFIGURACIÓN DE COLOR: ESTRICTAMENTE BLANCO Y NEGRO ---
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  
  let y = 15;

  // --- 1. CAJA RUC (Lado Derecho - Formato SUNAT) ---
  const boxWidth = 75;
  const boxHeight = 28;
  const boxX = width - margin - boxWidth;
  
  // Borde Negro
  doc.setLineWidth(0.4);
  doc.rect(boxX, y, boxWidth, boxHeight);
  
  // RUC
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`R.U.C. ${settings.ruc || '00000000000'}`, boxX + (boxWidth / 2), y + 8, { align: 'center' });
  
  // Tipo de Documento (Fondo Negro / Texto Blanco o Bordeado)
  // Para garantizar impresión B/N perfecta, usamos franja negra
  doc.setFillColor(0, 0, 0); 
  doc.rect(boxX, y + 10, boxWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text("RECIBO DE PAGO", boxX + (boxWidth / 2), y + 15.5, { align: 'center' });
  
  // Número
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text(`N° ${transaction.id.toUpperCase()}`, boxX + (boxWidth / 2), y + 24, { align: 'center' });

  // --- 2. DATOS DEL EMISOR (Lado Izquierdo) ---
  let textX = margin;
  
  // Logo (si existe)
  if (settings.logoUrl) {
    try {
      // Forzamos el logo a ser impreso tal cual (asumimos que el usuario sube un logo adecuado, 
      // pero el resto del texto será negro)
      doc.addImage(settings.logoUrl, 'PNG', margin, y, 22, 22, undefined, 'FAST');
      textX += 28;
    } catch(e) {
      // Fallback
    }
  }

  // Nombre Comercial
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(settings.gymName.toUpperCase(), textX, y + 5);

  // Razón Social
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  if (settings.businessName) {
      doc.text(settings.businessName, textX, y + 11);
  }

  // Dirección y Teléfono
  doc.setFont("helvetica", "normal");
  const addressLines = doc.splitTextToSize(settings.address || '', 85);
  doc.text(addressLines, textX, y + 16);
  
  if (settings.phone) {
    doc.text(`Telf: ${settings.phone}`, textX, y + 16 + (addressLines.length * 3.5) + 2);
  }

  y += 35; // Espacio vertical

  // --- 3. DATOS DEL CLIENTE ---
  // Línea superior
  doc.setLineWidth(0.1);
  doc.line(margin, y, width - margin, y);
  y += 5;

  doc.setFontSize(9);
  
  // Fila 1
  doc.setFont("helvetica", "bold");
  doc.text("Señor(es):", margin, y + 4);
  doc.setFont("helvetica", "normal");
  doc.text(transaction.clientName.toUpperCase(), margin + 25, y + 4);

  doc.setFont("helvetica", "bold");
  doc.text("Fecha Emisión:", width - margin - 45, y + 4, { align: 'right' });
  doc.setFont("helvetica", "normal");
  doc.text(new Date(transaction.date).toLocaleDateString(), width - margin, y + 4, { align: 'right' });

  // Fila 2
  doc.setFont("helvetica", "bold");
  doc.text("DNI/RUC:", margin, y + 9);
  doc.setFont("helvetica", "normal");
  doc.text(client?.dni || '-', margin + 25, y + 9);

  doc.setFont("helvetica", "bold");
  doc.text("Moneda:", width - margin - 45, y + 9, { align: 'right' });
  doc.setFont("helvetica", "normal");
  doc.text("SOLES", width - margin, y + 9, { align: 'right' });

  // Fila 3 (Dirección Cliente - placeholder)
  doc.setFont("helvetica", "bold");
  doc.text("Dirección:", margin, y + 14);
  doc.setFont("helvetica", "normal");
  doc.text("-", margin + 25, y + 14);

  y += 18;
  doc.line(margin, y, width - margin, y);

  // --- 4. TABLA DE ITEMS ---
  y += 2;
  
  // Encabezado
  doc.setFillColor(240, 240, 240); // Gris muy claro para encabezado de tabla (permitido en formal)
  doc.rect(margin, y, width - (margin * 2), 6, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("CANT.", margin + 4, y + 4);
  doc.text("DESCRIPCIÓN", margin + 20, y + 4);
  doc.text("P. UNIT", width - margin - 30, y + 4, { align: 'right' });
  doc.text("TOTAL", width - margin - 2, y + 4, { align: 'right' });

  y += 6;
  doc.setLineWidth(0.1);
  
  // Items
  doc.setFont("helvetica", "normal");
  
  const isProduct = transaction.type === 'product_sale';
  const qty = isProduct ? parseInt(transaction.itemDescription.split('x')[0]) || 1 : 1;
  const desc = isProduct ? transaction.itemDescription.split('x')[1] || transaction.itemDescription : transaction.itemDescription;
  const unitPrice = transaction.amount / qty;

  y += 5;
  doc.text(qty.toString(), margin + 6, y, { align: 'center' });
  doc.text(desc.trim(), margin + 20, y);
  doc.text(unitPrice.toFixed(2), width - margin - 30, y, { align: 'right' });
  doc.text(transaction.amount.toFixed(2), width - margin - 2, y, { align: 'right' });

  y += 20; // Espacio fijo para items (se puede hacer dinámico si hubiera array de items)

  // Línea final tabla
  doc.line(margin, y, width - margin, y);

  // --- 5. TOTALES E IMPORTES ---
  // Calculamos la base imponible asumiendo que el monto es Precio Final (Inc IGV 18%)
  const total = transaction.amount;
  const subtotal = total / 1.18;
  const igv = total - subtotal;

  y += 5;
  
  // Izquierda: Monto en Letras
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(numberToWords(total), margin, y + 4);

  // Derecha: Totales numéricos
  const rightLabelsX = width - margin - 35;
  const rightValuesX = width - margin;
  
  doc.text("OP. GRAVADA:", rightLabelsX, y + 4, { align: 'right' });
  doc.setFont("helvetica", "normal");
  doc.text(subtotal.toFixed(2), rightValuesX, y + 4, { align: 'right' });

  doc.setFont("helvetica", "bold");
  doc.text("I.G.V. (18%):", rightLabelsX, y + 9, { align: 'right' });
  doc.setFont("helvetica", "normal");
  doc.text(igv.toFixed(2), rightValuesX, y + 9, { align: 'right' });

  doc.setFont("helvetica", "bold");
  doc.text("IMPORTE TOTAL:", rightLabelsX, y + 14, { align: 'right' });
  doc.setFont("helvetica", "normal");
  doc.text(total.toFixed(2), rightValuesX, y + 14, { align: 'right' });

  // --- 6. PIE DE PAGINA / OBSERVACIONES ---
  y += 25;
  
  // Caja de observaciones
  doc.setDrawColor(0, 0, 0);
  doc.rect(margin, y, width - (margin * 2), 15);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("OBSERVACIONES:", margin + 2, y + 4);
  doc.setFont("helvetica", "normal");
  doc.text("Gracias por su preferencia. Conserve este documento.", margin + 2, y + 8);

  // Disclaimer Legal - MODIFICADO para ser lógico y no presumir autorización falsa
  y += 22;
  doc.setFontSize(7);
  doc.text("COMPROBANTE DE PAGO - CONTROL INTERNO", width / 2, y, { align: 'center' });
  doc.text("Este documento no tiene valor tributario. Uso exclusivo para control interno.", width / 2, y + 4, { align: 'center' });
  
  doc.save(`Recibo_${transaction.id}.pdf`);
};