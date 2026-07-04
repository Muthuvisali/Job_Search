import mammoth from 'mammoth'

export async function parseResumeFile(file) {
  const ext = file.name.split('.').pop().toLowerCase()

  if (ext === 'docx') {
    return parseDocx(file)
  } else if (ext === 'pdf') {
    return parsePdf(file)
  } else if (ext === 'txt') {
    return file.text()
  }
  throw new Error('Unsupported file type. Please upload .docx, .pdf, or .txt')
}

async function parseDocx(file) {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

async function parsePdf(file) {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).toString()

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: arrayBuffer }).promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(content.items.map((item) => item.str).join(' '))
  }
  return pages.join('\n')
}

export async function structureResume(rawText, llmCall) {
  const prompt = `You are a resume parser. Extract structured information from this resume text.

Return ONLY a JSON object with this exact schema:
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "summary": "string (professional summary or objective)",
  "experience": [
    {
      "title": "string",
      "company": "string",
      "duration": "string",
      "bullets": ["string"]
    }
  ],
  "education": [
    { "degree": "string", "school": "string", "year": "string" }
  ],
  "skills": ["string"],
  "certifications": ["string"],
  "projects": [
    { "name": "string", "description": "string", "technologies": ["string"] }
  ]
}

Resume text:
${rawText.slice(0, 6000)}`

  const json = await llmCall(prompt, 1200)
  try {
    const match = json.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : { rawText }
  } catch {
    return { rawText }
  }
}
