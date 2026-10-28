const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const SemesterPerformance = require('../models/SemesterPerformance');
const User = require('../models/User');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');

const upload = multer({ storage: multer.memoryStorage() });

const analyzeMarksheetText = (text) => {
  const t = text.toUpperCase();
  
  // 1. Remove strict validation - accept any file
  // 2. Extract Data
  const data = {
    valid: true,
    rawText: text,
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

  // Name extraction
  const nameMatch = t.match(/NAME\s*(?:OF\s*THE\s*CANDIDATE)?\s*[:\-]?\s*([A-Z\s\.]+)/);
  if (nameMatch && nameMatch[1]) data.studentName = nameMatch[1].trim();
  
  // Register / Roll Number
  const regMatch = t.match(/(?:REGISTER|ROLL|REG)\s*(?:NO|NUMBER)?\s*[:\-]?\s*([A-Z0-9]+)/);
  if (regMatch && regMatch[1]) data.registerNumber = regMatch[1].trim();

  // Programme
  const progMatch = t.match(/(?:PROGRAMME|DEGREE|BRANCH)\s*[:\-]?\s*([A-Z\s\.\&]+)/);
  if (progMatch && progMatch[1] && progMatch[1].length > 3) data.programme = progMatch[1].trim();

  // Examination
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

    // CGPA
    const cgpaMatch = t.match(/(?:CUMULATIVE GRADE POINT AVERAGE[\s\(\)]*CGPA[\s\(\)]*|CGPA|CUMULATIVE GRADE POINT AVERAGE)[\s:=]*([0-9]{1,2}\.[0-9]{1,2})/);
    if (cgpaMatch) data.cgpa = parseFloat(cgpaMatch[1]);
    
    // SGPA / GPA
    const sgpaMatch = t.match(/(?:SEMESTER GRADE POINT AVERAGE[\s\(\)]*SGPA[\s\(\)]*|GRADE POINT AVERAGE[\s\(\)]*GPA[\s\(\)]*|SGPA|GPA|SEMESTER GRADE POINT AVERAGE|GRADE POINT AVERAGE)[\s:=]*([0-9]{1,2}\.[0-9]{1,2})/);
    if (sgpaMatch) data.sgpa = parseFloat(sgpaMatch[1]);
    
    // Credits Earned
    const creditsMatch = t.match(/(?:CUMULATIVE CREDITS EARNED|CREDITS EARNED|CREDITS)[\s:=]*([0-9]{1,3})/);
    if (creditsMatch) data.credits = parseInt(creditsMatch[1], 10);

  // Extract subjects
  const lines = t.split('\n');
  let totalCredits = 0;

  for (const line of lines) {
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

    match = line.match(/([A-Z\s\-\&\,]{5,})(?:GRADE[\s\:-]*)?\b(O|A\+|A|B\+|B|C|U|F|S)\b(?:[\s\w\:-]*?)\b([0-9]{1,2})\b(?:[\s\w\:-]*?)\b([0-9]{1,2})\b/);
    if (match) {
      const code = 'N/A';
      let name = match[1].trim().replace(/ (PASS|FAIL|COMPLETED)$/, '');
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

  return data;
};

const { callGroqAPI } = require('./ai');

// OCR Extraction Route
router.post('/extract', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { mimetype, buffer } = req.file;
    let extractedText = '';

    if (mimetype === 'application/pdf') {
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text;
    } else if (mimetype.startsWith('image/')) {
      const result = await Tesseract.recognize(buffer, 'eng');
      extractedText = result.data.text;
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Please upload a PDF or Image.' });
    }

    let analysisResult = analyzeMarksheetText(extractedText);

    // Use Groq LLM to intelligently extract and refine marksheet data
    try {
      const groqPrompt = `Here is raw extracted marksheet text:
---
${extractedText}
---

Extract the academic information accurately into JSON format:
{
  "studentName": string or "Not detected",
  "registerNumber": string or "Not detected",
  "programme": string or "Not detected",
  "examination": string or "Not detected",
  "semester": integer (1 to 8) or null,
  "sgpa": number (e.g. 7.92) or null,
  "cgpa": number (e.g. 7.25) or null,
  "credits": integer (e.g. 24, 75) or null,
  "subjects": [
    { "code": "CS8401", "name": "Subject Name", "grade": "A+", "gradePoint": 9, "credit": 3 }
  ]
}
Return ONLY valid JSON.`;

      const rawAi = await callGroqAPI([
        { role: 'system', content: 'You are an accurate OCR academic document extraction engine that outputs JSON only.' },
        { role: 'user', content: groqPrompt }
      ], 0.1, 1500, true);

      const parsedAi = JSON.parse(rawAi);
      
      // Merge AI-parsed results if available
      analysisResult = {
        ...analysisResult,
        studentName: parsedAi.studentName && parsedAi.studentName !== 'Not detected' ? parsedAi.studentName : analysisResult.studentName,
        registerNumber: parsedAi.registerNumber && parsedAi.registerNumber !== 'Not detected' ? parsedAi.registerNumber : analysisResult.registerNumber,
        programme: parsedAi.programme && parsedAi.programme !== 'Not detected' ? parsedAi.programme : analysisResult.programme,
        examination: parsedAi.examination && parsedAi.examination !== 'Not detected' ? parsedAi.examination : analysisResult.examination,
        semester: parsedAi.semester || analysisResult.semester,
        sgpa: parsedAi.sgpa != null ? parsedAi.sgpa : analysisResult.sgpa,
        cgpa: parsedAi.cgpa != null ? parsedAi.cgpa : analysisResult.cgpa,
        credits: parsedAi.credits != null ? parsedAi.credits : analysisResult.credits,
        subjects: Array.isArray(parsedAi.subjects) && parsedAi.subjects.length > 0 ? parsedAi.subjects : analysisResult.subjects
      };
    } catch (aiErr) {
      console.warn('Groq OCR refinement fallback to regex:', aiErr.message);
    }

    res.json(analysisResult);
  } catch (error) {
    console.error('OCR Extraction Error:', error);
    res.status(500).json({ error: 'Failed to process document during extraction.' });
  }
});

// GET /api/semesterPerformances/:id/document - Stream or serve actual uploaded marksheet
router.get('/:id/document', async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

    let user = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        user = decoded.user;
      } catch (e) {
        try {
          const decoded = jwt.verify(token, 'fallback_secret');
          user = decoded.user;
        } catch (err) {
          // Token invalid, ignore
        }
      }
    }

    const item = await SemesterPerformance.findById(req.params.id);
    if (!item) {
      return res.status(404).send('Semester result record not found.');
    }

    if (user) {
      const dbUser = await User.findById(user.id);
      const isStaff = dbUser && dbUser.role === 'staff';
      const isOwner = item.user_id.toString() === user.id;
      if (!isStaff && !isOwner) {
        return res.status(403).send('Unauthorized to access this document.');
      }
    }

    if (!item.file_url) {
      return res.status(404).send('No document uploaded for this semester result.');
    }

    const isDownload = req.query.download === '1' || req.query.download === 'true';
    const isPdf = Boolean(
      item.file_type === 'pdf' || 
      item.file_url.includes('application/pdf') || 
      (item.file_name && item.file_name.toLowerCase().endsWith('.pdf'))
    );
    const defaultName = isPdf ? `semester_${item.semester}_marksheet.pdf` : `semester_${item.semester}_marksheet.png`;
    const rawName = item.file_name || defaultName;
    const filename = rawName.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Handle Data URL (Base64)
    if (item.file_url.startsWith('data:')) {
      const matches = item.file_url.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).send('Malformed document data URL.');
      }
      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Content-Disposition', `${isDownload ? 'attachment' : 'inline'}; filename="${filename}"`);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      return res.end(buffer);
    }

    // External URL
    if (item.file_url.startsWith('http')) {
      return res.redirect(item.file_url);
    }

    return res.status(400).send('Unsupported document storage format.');
  } catch (err) {
    console.error('Error serving semester result document:', err);
    res.status(500).send('Server Error loading document.');
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const items = await SemesterPerformance.find({ user_id: req.user.id }).sort({ semester: 1 });
    res.json(items);
  } catch (err) {
    console.error('Error fetching semester performances:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const semesterNum = parseInt(req.body.semester, 10);
    if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 8) {
      return res.status(400).json({ error: 'Valid semester number (1-8) is required' });
    }

    let calculatedSgpa = req.body.sgpa != null && req.body.sgpa !== '' ? parseFloat(req.body.sgpa) : 0;
    let creditsEarned = req.body.credits_earned != null ? parseInt(req.body.credits_earned, 10) : (req.body.credits || 0);
    let creditsTotal = req.body.credits_total != null ? parseInt(req.body.credits_total, 10) : creditsEarned;

    // If SGPA is missing but subjects exist, calculate from credits and gradePoints
    if ((!calculatedSgpa || isNaN(calculatedSgpa)) && Array.isArray(req.body.subjects) && req.body.subjects.length > 0) {
      let totalPts = 0;
      let totalCreds = 0;
      req.body.subjects.forEach(sub => {
        const c = parseFloat(sub.credit) || 0;
        const gp = parseFloat(sub.gradePoint) || 0;
        if (c > 0) {
          totalCreds += c;
          totalPts += (c * gp);
        }
      });
      if (totalCreds > 0) {
        calculatedSgpa = parseFloat((totalPts / totalCreds).toFixed(2));
        if (!creditsEarned) creditsEarned = totalCreds;
        if (!creditsTotal) creditsTotal = totalCreds;
      }
    }

    const payload = {
      ...req.body,
      user_id: req.user.id,
      semester: semesterNum,
      sgpa: isNaN(calculatedSgpa) ? 0 : calculatedSgpa,
      credits_earned: isNaN(creditsEarned) ? 0 : creditsEarned,
      credits_total: isNaN(creditsTotal) ? 0 : creditsTotal,
      attendance_percent: req.body.attendance_percent != null ? Number(req.body.attendance_percent) : 85,
      verification_status: req.body.verification_status || 'pending',
    };

    let item = await SemesterPerformance.findOne({ user_id: req.user.id, semester: semesterNum });
    if (item) {
      item = await SemesterPerformance.findByIdAndUpdate(item._id, { $set: payload }, { new: true });
    } else {
      item = new SemesterPerformance(payload);
      await item.save();
    }

    res.json(item);
  } catch (err) {
    console.error('Error saving semester performance:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    let item = await SemesterPerformance.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Item not found' });
    if (item.user_id.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });
    
    item = await SemesterPerformance.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    res.json(item);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    let item = await SemesterPerformance.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'Item not found' });
    if (item.user_id.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

    await SemesterPerformance.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Item removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
