/**
 * PDF Export Utility
 * 
 * Exports AI artifacts (Summary, Minutes, Action Items) as formatted PDF documents
 */

import { jsPDF } from 'jspdf';
import { MeetingArtifact, ArtifactType } from './api/transcript';

// PDF configuration
const PDF_CONFIG = {
  margin: 20,
  lineHeight: 7,
  fontSize: {
    title: 18,
    heading: 14,
    body: 11,
    small: 9,
  },
  pageWidth: 210, // A4 width in mm
  pageHeight: 297, // A4 height in mm
};

/**
 * Get display title for artifact type
 */
function getArtifactTitle(type: ArtifactType): string {
  const titles: Record<ArtifactType, string> = {
    SUMMARY: 'Meeting Summary',
    MINUTES: 'Meeting Minutes',
    ACTION_ITEMS: 'Action Items',
  };
  return titles[type];
}

/**
 * Strip markdown formatting for plain text
 */
function stripMarkdown(content: string): string {
  return content
    .replace(/#{1,6}\s/g, '') // Remove headings
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.+?)\*/g, '$1') // Remove italic
    .replace(/`(.+?)`/g, '$1') // Remove inline code
    .replace(/^\s*[-*]\s/gm, '• ') // Convert list markers to bullets
    .replace(/^\s*\d+\.\s/gm, '') // Remove numbered list markers
    .trim();
}

/**
 * Split text into lines that fit within the page width
 */
function splitTextToLines(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth);
}

/**
 * Export a single artifact as PDF
 */
export function exportArtifactAsPDF(
  artifact: MeetingArtifact,
  meetingTitle?: string
): void {
  if (!artifact.content) {
    console.warn('Cannot export artifact without content');
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const { margin, lineHeight, fontSize, pageWidth, pageHeight } = PDF_CONFIG;
  const contentWidth = pageWidth - margin * 2;
  let yPosition = margin;

  // Title
  doc.setFontSize(fontSize.title);
  doc.setFont('helvetica', 'bold');
  doc.text(getArtifactTitle(artifact.type), margin, yPosition);
  yPosition += lineHeight * 2;

  // Meeting title if provided
  if (meetingTitle) {
    doc.setFontSize(fontSize.heading);
    doc.setFont('helvetica', 'normal');
    doc.text(meetingTitle, margin, yPosition);
    yPosition += lineHeight * 1.5;
  }

  // Generated date
  doc.setFontSize(fontSize.small);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date(artifact.updatedAt).toLocaleString()}`, margin, yPosition);
  yPosition += lineHeight * 2;

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += lineHeight;

  // Content
  doc.setFontSize(fontSize.body);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  const plainContent = stripMarkdown(artifact.content);
  const paragraphs = plainContent.split('\n\n');

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) continue;

    const lines = splitTextToLines(doc, paragraph.trim(), contentWidth);

    for (const line of lines) {
      // Check if we need a new page
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }

      // Check if line is a bullet point
      if (line.startsWith('•')) {
        doc.text(line, margin, yPosition);
      } else {
        doc.text(line, margin, yPosition);
      }
      yPosition += lineHeight;
    }

    yPosition += lineHeight * 0.5; // Paragraph spacing
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(fontSize.small);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Generate filename
  const typeNames: Record<ArtifactType, string> = {
    SUMMARY: 'summary',
    MINUTES: 'minutes',
    ACTION_ITEMS: 'action-items',
  };
  const filename = `${typeNames[artifact.type]}-${artifact.meetingId.slice(0, 8)}.pdf`;

  // Download
  doc.save(filename);
}

/**
 * Export all artifacts as a single PDF
 */
export function exportAllArtifactsAsPDF(
  artifacts: MeetingArtifact[],
  meetingTitle?: string
): void {
  const completedArtifacts = artifacts.filter(
    (a) => a.status === 'COMPLETED' && a.content
  );

  if (completedArtifacts.length === 0) {
    console.warn('No completed artifacts to export');
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const { margin, lineHeight, fontSize, pageWidth, pageHeight } = PDF_CONFIG;
  const contentWidth = pageWidth - margin * 2;

  // Cover page
  let yPosition = pageHeight / 3;
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Meeting Artifacts', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += lineHeight * 2;

  if (meetingTitle) {
    doc.setFontSize(fontSize.heading);
    doc.setFont('helvetica', 'normal');
    doc.text(meetingTitle, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += lineHeight * 2;
  }

  doc.setFontSize(fontSize.body);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Generated: ${new Date().toLocaleString()}`,
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  );

  // Each artifact on new page
  for (const artifact of completedArtifacts) {
    doc.addPage();
    yPosition = margin;

    // Artifact title
    doc.setFontSize(fontSize.title);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(getArtifactTitle(artifact.type), margin, yPosition);
    yPosition += lineHeight * 2;

    // Divider line
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += lineHeight;

    // Content
    doc.setFontSize(fontSize.body);
    doc.setFont('helvetica', 'normal');

    const plainContent = stripMarkdown(artifact.content || '');
    const paragraphs = plainContent.split('\n\n');

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) continue;

      const lines = splitTextToLines(doc, paragraph.trim(), contentWidth);

      for (const line of lines) {
        if (yPosition > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += lineHeight;
      }

      yPosition += lineHeight * 0.5;
    }
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(fontSize.small);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Download
  const meetingId = completedArtifacts[0]?.meetingId || 'meeting';
  const filename = `meeting-artifacts-${meetingId.slice(0, 8)}.pdf`;
  doc.save(filename);
}
