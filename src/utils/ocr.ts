export const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script ${src}`));
    document.head.appendChild(script);
  });
};

export const extractTextFromImage = async (fileUrl: string): Promise<string> => {
  await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
  // @ts-ignore
  const Tesseract = window.Tesseract;
  if (!Tesseract) throw new Error('Tesseract failed to load');

  const result = await Tesseract.recognize(fileUrl, 'eng', {
    logger: (m: any) => console.log(m)
  });
  return result.data.text;
};

export const extractTextFromPDF = async (fileUrl: string): Promise<string> => {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js');
  // @ts-ignore
  const pdfjsLib = window['pdfjs-dist/build/pdf'];
  
  if (!pdfjsLib) throw new Error('PDF.js failed to load');
  
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

  const loadingTask = pdfjsLib.getDocument(fileUrl);
  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
};

export const analyzeMarksheetText = (text: string) => {
  const t = text.toUpperCase();
  
  // 1. Validate if it's a marksheet
  const validationKeywords = ['MARK', 'STATEMENT', 'SEMESTER', 'GRADE', 'CREDIT', 'CGPA', 'SGPA', 'COURSE', 'SUBJECT', 'UNIVERSITY', 'EXAMINATION', 'RESULT', 'ACADEMIC'];
  
  let matchCount = 0;
  validationKeywords.forEach(kw => {
    if (t.includes(kw)) matchCount++;
  });

  if (matchCount < 3) {
    return { valid: false, reason: 'Does not appear to be an academic marksheet. Ensure it is clear and official.' };
  }

  // 2. Extract Data
  const data: any = {
    valid: true,
    studentName: 'Not detected',
    registerNumber: 'Not detected',
    programme: 'Not detected',
    examination: 'Not detected',
    semester: 'Not detected',
    sgpa: null,
    cgpa: null,
    credits: null,
    subjects: []
  };

  // Name extraction (e.g. NAME : JOHN DOE)
  const nameMatch = t.match(/NAME\s*(?:OF\s*THE\s*CANDIDATE)?\s*[:\-]?\s*([A-Z\s\.]+)/);
  if (nameMatch && nameMatch[1]) data.studentName = nameMatch[1].trim();
  
  // Register / Roll Number (e.g. REGISTER NO : 123456)
  const regMatch = t.match(/(?:REGISTER|ROLL|REG)\s*(?:NO|NUMBER)?\s*[:\-]?\s*([A-Z0-9]+)/);
  if (regMatch && regMatch[1]) data.registerNumber = regMatch[1].trim();

  // Programme (e.g. PROGRAMME : B.E. COMPUTER SCIENCE)
  const progMatch = t.match(/(?:PROGRAMME|DEGREE|BRANCH)\s*[:\-]?\s*([A-Z\s\.\&]+)/);
  if (progMatch && progMatch[1] && progMatch[1].length > 3) data.programme = progMatch[1].trim();

  // Examination (e.g. EXAMINATION : NOV 2023)
  const examMatch = t.match(/(?:EXAMINATION|EXAM|SESSION)\s*[:\-]?\s*([A-Z]+[\s\-]*[0-9]{4})/);
  if (examMatch && examMatch[1]) data.examination = examMatch[1].trim();

  // Semester
  const semMatch = t.match(/(?:SEMESTER|SEM)[\s:-]*([1-8IVX]+)/);
  if (semMatch && semMatch[1]) {
    const s = semMatch[1].trim();
    if (['I','1'].includes(s)) data.semester = 1;
    else if (['II','2'].includes(s)) data.semester = 2;
    else if (['III','3'].includes(s)) data.semester = 3;
    else if (['IV','4'].includes(s)) data.semester = 4;
    else if (['V','5'].includes(s)) data.semester = 5;
    else if (['VI','6'].includes(s)) data.semester = 6;
    else if (['VII','7'].includes(s)) data.semester = 7;
    else if (['VIII','8'].includes(s)) data.semester = 8;
    else data.semester = parseInt(s, 10) || 'Not detected';
  }

  // GPA / CGPA
  const cgpaMatch = t.match(/CGPA[\s:=]*([0-9]{1,2}\.[0-9]{1,2})/);
  if (cgpaMatch) data.cgpa = parseFloat(cgpaMatch[1]);
  
  const sgpaMatch = t.match(/(?:SGPA|GPA)[\s:=]*([0-9]{1,2}\.[0-9]{1,2})/);
  if (sgpaMatch) data.sgpa = parseFloat(sgpaMatch[1]);

  // Extract subjects
  const lines = t.split('\n');
  let totalCredits = 0;

  for (const line of lines) {
    // Try Pattern 1: With Course Code (e.g. CS101 ADVANCED DATA STRUCTURES A+ 4 9)
    let match = line.match(/([A-Z]{2,4}[0-9]{3,4}[A-Z]*)\s+([A-Z\s\-\&\,]+?)\s+\b(O|A\+|A|B\+|B|C|U|F|S)\b\s+([0-9]{1,2})\s+([0-9]{1,2})/);
    if (match) {
      const code = match[1].trim();
      let name = match[2].trim().replace(/ (PASS|FAIL|COMPLETED)$/, '');
      const grade = match[3];
      const n1 = parseInt(match[4], 10);
      const n2 = parseInt(match[5], 10);
      const credit = (n1 < 6) ? n1 : n2;
      const gradePoint = (n1 >= 6) ? n1 : n2;
      
      totalCredits += credit;
      data.subjects.push({ code, name, grade, gradePoint, credit });
      continue;
    }

    // Try Pattern 2: Without Course Code or mixed keywords (e.g. ADVANCED DATA STRUCTURES Grade: A Grade Point: 8 Credits: 3)
    // Looking for a name string, a grade, and at least two numbers.
    match = line.match(/([A-Z\s\-\&\,]{5,})(?:GRADE[\s\:-]*)?\b(O|A\+|A|B\+|B|C|U|F|S)\b(?:[\s\w\:-]*?)\b([0-9]{1,2})\b(?:[\s\w\:-]*?)\b([0-9]{1,2})\b/);
    if (match) {
      const code = 'N/A';
      let name = match[1].trim().replace(/ (PASS|FAIL|COMPLETED)$/, '');
      // Avoid matching generic headers
      if (name.includes('COURSE') || name.includes('SEMESTER') || name.includes('RESULT')) continue;
      
      const grade = match[2];
      const n1 = parseInt(match[3], 10);
      const n2 = parseInt(match[4], 10);
      const credit = (n1 < 6) ? n1 : n2;
      const gradePoint = (n1 >= 6) ? n1 : n2;

      totalCredits += credit;
      data.subjects.push({ code, name, grade, gradePoint, credit });
    }
  }

  if (data.subjects.length > 0 && !data.credits) {
    data.credits = totalCredits;
  }

  // Strict Validation: If no subjects extracted, assume it's not a valid marksheet or OCR failed entirely
  if (data.subjects.length === 0) {
    return { valid: false, reason: 'Unable to extract subject results. Please ensure the document is a clear, official marksheet.' };
  }

  return data;
};
