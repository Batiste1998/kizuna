import PDFDocument from 'pdfkit';

export interface BilanPdfData {
  organizationName: string;
  bilanLabel: string;
  scheduledAt: Date;
  status: string;
  summary: string | null;
  alternantName: string;
  promotionName: string | null;
  entrepriseName: string | null;
  tuteurPedaName: string | null;
  tuteurEntrepriseName: string | null;
  generatedAt: Date;
}

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planifié',
  done: 'Réalisé',
  signed: 'Signé',
};

const INK = '#1b1b19';
const MUTED = '#76766f';
const BRAND = '#2e9e82';
const HAIRLINE = '#e4e4de';

/** Renders the tripartite review as an A4 PDF (returned as a readable stream). */
export function renderBilanPdf(data: BilanPdfData): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: 56, info: { Title: data.bilanLabel } });
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;

  // Header
  doc.fontSize(10).fillColor(BRAND).font('Helvetica-Bold').text('KIZUNA — SUIVI D’ALTERNANCE');
  doc
    .moveDown(0.2)
    .fontSize(9)
    .fillColor(MUTED)
    .font('Helvetica')
    .text(data.organizationName || '');
  doc.moveDown(1.2);
  doc.fontSize(20).fillColor(INK).font('Helvetica-Bold').text('Compte rendu de bilan tripartite');
  doc.moveDown(0.3).fontSize(13).fillColor(MUTED).font('Helvetica').text(data.bilanLabel);

  doc.moveDown(1);
  hr(doc, left, width);

  // Facts grid (two columns)
  const facts: Array<[string, string]> = [
    ['Alternant', data.alternantName],
    ['Promotion', data.promotionName ?? '—'],
    ['Entreprise', data.entrepriseName ?? '—'],
    ['Tuteur pédagogique', data.tuteurPedaName ?? '—'],
    ['Tuteur d’entreprise', data.tuteurEntrepriseName ?? '—'],
    [
      'Date du bilan',
      data.scheduledAt.toLocaleString('fr-FR', {
        dateStyle: 'long',
        timeStyle: 'short',
        timeZone: 'Europe/Paris',
      }),
    ],
    ['Statut', STATUS_LABELS[data.status] ?? data.status],
  ];
  doc.moveDown(1);
  const colWidth = width / 2;
  const startY = doc.y;
  facts.forEach(([label, value], i) => {
    const x = left + (i % 2) * colWidth;
    const y = startY + Math.floor(i / 2) * 42;
    doc.fontSize(8.5).fillColor(MUTED).font('Helvetica-Bold').text(label.toUpperCase(), x, y);
    doc
      .fontSize(11.5)
      .fillColor(INK)
      .font('Helvetica')
      .text(value, x, y + 13, { width: colWidth - 16 });
  });
  doc.x = left;
  doc.y = startY + Math.ceil(facts.length / 2) * 42 + 8;

  // Summary
  hr(doc, left, width);
  doc.moveDown(1);
  doc.fontSize(12).fillColor(INK).font('Helvetica-Bold').text('Synthèse de l’entretien');
  doc.moveDown(0.5);
  doc
    .fontSize(10.5)
    .fillColor(data.summary ? INK : MUTED)
    .font('Helvetica')
    .text(data.summary || 'Aucune synthèse renseignée.', { width, lineGap: 3 });

  // Signature blocks
  const sigY = Math.max(doc.y + 48, doc.page.height - 220);
  const sigWidth = (width - 32) / 3;
  const signers: Array<[string, string]> = [
    ['Alternant', data.alternantName],
    ['Tuteur pédagogique', data.tuteurPedaName ?? '—'],
    ['Tuteur d’entreprise', data.tuteurEntrepriseName ?? '—'],
  ];
  signers.forEach(([role, name], i) => {
    const x = left + i * (sigWidth + 16);
    doc.fontSize(8.5).fillColor(MUTED).font('Helvetica-Bold').text(role.toUpperCase(), x, sigY);
    doc
      .fontSize(10)
      .fillColor(INK)
      .font('Helvetica')
      .text(name, x, sigY + 13, { width: sigWidth });
    doc
      .moveTo(x, sigY + 64)
      .lineTo(x + sigWidth, sigY + 64)
      .strokeColor(HAIRLINE)
      .stroke();
    doc
      .fontSize(8)
      .fillColor(MUTED)
      .text('Signature', x, sigY + 68);
  });

  // Footer
  doc
    .fontSize(8)
    .fillColor(MUTED)
    .text(
      `Document généré par Kizuna le ${data.generatedAt.toLocaleDateString('fr-FR', { dateStyle: 'long', timeZone: 'Europe/Paris' })}.`,
      left,
      doc.page.height - doc.page.margins.bottom - 12,
      { width },
    );

  doc.end();
  return doc;
}

function hr(doc: PDFKit.PDFDocument, x: number, width: number) {
  doc
    .moveTo(x, doc.y)
    .lineTo(x + width, doc.y)
    .strokeColor(HAIRLINE)
    .stroke();
}
