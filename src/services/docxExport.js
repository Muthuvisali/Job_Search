import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Packer,
  SectionType,
} from 'docx'

function textToDocxParagraphs(text) {
  if (!text) return [new Paragraph({ text: '' })]
  return text.split('\n').map((line) => {
    const trimmed = line.trim()
    if (!trimmed) return new Paragraph({ text: '' })

    // Detect headers (ALL CAPS short lines or lines ending with ':')
    if (trimmed === trimmed.toUpperCase() && trimmed.length < 40 && trimmed.length > 2) {
      return new Paragraph({
        text: trimmed,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 80 },
      })
    }

    // Detect bullets
    if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
      return new Paragraph({
        text: trimmed.replace(/^[•\-\*]\s*/, ''),
        bullet: { level: 0 },
      })
    }

    return new Paragraph({ text: trimmed, spacing: { after: 40 } })
  })
}

export async function downloadResumeDocx(tailoredResumeText, jobTitle, company) {
  const paragraphs = textToDocxParagraphs(tailoredResumeText)

  const doc = new Document({
    sections: [{
      properties: { type: SectionType.CONTINUOUS },
      children: [
        new Paragraph({
          text: `Tailored Resume — ${jobTitle} at ${company}`,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
        }),
        ...paragraphs,
      ],
    }],
  })

  const buffer = await Packer.toBlob(doc)
  triggerDownload(buffer, `Resume_${company}_${jobTitle}.docx`)
}

export async function downloadCoverLetterDocx(coverLetterText, jobTitle, company) {
  const paragraphs = coverLetterText.split('\n\n').map((para) =>
    new Paragraph({
      children: [new TextRun({ text: para.trim(), size: 24 })],
      spacing: { after: 200 },
    })
  )

  const doc = new Document({
    sections: [{
      properties: { type: SectionType.CONTINUOUS },
      children: [
        new Paragraph({
          text: `Cover Letter — ${jobTitle} at ${company}`,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
        }),
        ...paragraphs,
      ],
    }],
  })

  const buffer = await Packer.toBlob(doc)
  triggerDownload(buffer, `CoverLetter_${company}_${jobTitle}.docx`)
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
