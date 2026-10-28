
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const https = require('https');
const jwt = require('jsonwebtoken');

// API keys and secrets must be configured in backend environment variables.
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const GROQ_MODELS = [
  process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b'
];

/**
 * Helper to call Groq Chat Completions API with fallback models.
 */
async function callGroqAPI(
  messages,
  temperature = 0.6,
  max_tokens = 1024,
  jsonMode = false
) {
  if (!GROQ_API_KEY) {
    throw new Error(
      'GROQ_API_KEY is not configured in the backend environment.'
    );
  }

  let lastError = null;

  for (const model of GROQ_MODELS) {
    try {
      const payload = {
        model,
        messages,
        temperature,
        max_tokens
      };

      if (jsonMode) {
        payload.response_format = { type: 'json_object' };
      }

      const responseText = await new Promise((resolve, reject) => {
        const postData = JSON.stringify(payload);

        const req = https.request(
          {
            hostname: 'api.groq.com',
            path: '/openai/v1/chat/completions',
            method: 'POST',
            headers: {
              Authorization: `Bearer ${GROQ_API_KEY}`,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 20000
          },
          (res) => {
            let data = '';

            res.on('data', (chunk) => {
              data += chunk;
            });

            res.on('end', () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve(data);
              } else {
                reject(
                  new Error(`Groq returned HTTP ${res.statusCode}`)
                );
              }
            });
          }
        );

        req.on('error', reject);

        req.on('timeout', () => {
          req.destroy(new Error('Groq request timed out'));
        });

        req.write(postData);
        req.end();
      });

      const parsed = JSON.parse(responseText);
      const content = parsed.choices?.[0]?.message?.content || '';

      return content.trim();
    } catch (err) {
      // Avoid logging API keys or sensitive request data.
      console.error(
        `Groq call failed with model ${model}:`,
        err.message
      );

      lastError = err;
    }
  }

  throw lastError || new Error('All Groq models failed.');
}

/**
 * Optional authentication middleware.
 * Invalid or missing tokens are treated as unauthenticated.
 */
const optionalAuth = (req, res, next) => {
  const authorization = req.header('Authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : null;

  const jwtSecret = process.env.JWT_SECRET;

  if (token && jwtSecret) {
    try {
      const decoded = jwt.verify(token, jwtSecret);
      req.user = decoded?.user;
    } catch (err) {
      // Continue without optional authentication.
    }
  }

  next();
};

/**
 * POST /api/ai/chat
 * Handles Student AI Assistant conversational chat.
 */
router.post('/chat', optionalAuth, async (req, res) => {
  try {
    const {
      message,
      history = [],
      context = {}
    } = req.body || {};

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        message: 'Message is required.'
      });
    }

    const {
      studentName = 'Student',
      department = 'Computer Science',
      semester = 1,
      cgpa = '0.00',
      skills = [],
      projectsCount = 0,
      internshipsCount = 0,
      certsCount = 0
    } = context;

    const systemPrompt = `You are a friendly, warm, and helpful AI Career & Academic Growth Assistant for college students.

Student Info:
- Name: ${studentName}
- Department: ${department} (Semester ${semester})
- Current Verified CGPA: ${cgpa}
- Skills: ${
      Array.isArray(skills) && skills.length > 0
        ? skills.join(', ')
        : 'None added yet'
    }
- Projects: ${projectsCount}
- Internships: ${internshipsCount}
- Certifications: ${certsCount}

Guidelines:
1. Be friendly, warm, natural, and helpful.
2. Answer clearly, directly, and specifically.
3. If the user greets you, respond warmly and briefly.
4. Give accurate, relevant answers about coding, careers, academics, DSA, technology, and general topics.
5. Format key points using Markdown when helpful.`;

    const formattedMessages = [
      { role: 'system', content: systemPrompt }
    ];

    if (Array.isArray(history)) {
      const recentHistory = history.slice(-8);

      for (const h of recentHistory) {
        if (!h || typeof h !== 'object') continue;

        const role =
          h.sender === 'user' || h.role === 'user'
            ? 'user'
            : h.sender === 'ai' ||
                h.role === 'assistant'
              ? 'assistant'
              : null;

        const content = h.text ?? h.content;

        if (role && typeof content === 'string' && content.trim()) {
          formattedMessages.push({
            role,
            content: content.trim()
          });
        }
      }
    }

    formattedMessages.push({
      role: 'user',
      content: message.trim()
    });

    const reply = await callGroqAPI(
      formattedMessages,
      0.7,
      800
    );

    return res.json({ reply });
  } catch (err) {
    console.error('AI Chat Error:', err.message);

    return res.status(500).json({
      message: 'Failed to process AI response.',
      reply:
        "Hey! I'm having a little trouble connecting right now, but please ask again in a moment! 😊"
    });
  }
});

/**
 * POST /api/ai/suggestions
 * Generates dynamic growth recommendations for a student.
 */
router.post('/suggestions', auth, async (req, res) => {
  try {
    const {
      skills = [],
      projects = [],
      certifications = [],
      internships = [],
      growthMetrics = {}
    } = req.body || {};

    const prompt = `Analyze this college student's profile:
- Skills: ${
      skills.map((s) =>
        `${s.skill_name} (${s.proficiency}%)`
      ).join(', ') || 'None'
    }
- Projects Count: ${projects.length}
- Certifications Count: ${certifications.length}
- Internships Count: ${internships.length}
- Growth Score: ${growthMetrics.overall_score || 0}%

Generate 4 to 6 concise, actionable growth suggestions in JSON format.

Return ONLY valid JSON in this structure:
{
  "suggestions": [
    {
      "id": "1",
      "title": "Short title",
      "description": "1-2 sentences on what to do",
      "priority": "high",
      "category": "skills",
      "impact": "+10% Growth Score",
      "action": "Concrete step"
    }
  ]
}

category must be one of: skills, projects, certifications, internships, soft_skills, communication.
priority must be one of: high, medium, low.`;

    const raw = await callGroqAPI(
      [
        {
          role: 'system',
          content:
            'You are an AI college career advisor that outputs valid JSON only.'
        },
        { role: 'user', content: prompt }
      ],
      0.3,
      1000,
      true
    );

    const parsed = JSON.parse(raw);

    return res.json(parsed);
  } catch (err) {
    console.error('AI Suggestions Error:', err.message);

    return res.status(500).json({
      message: 'Failed to generate suggestions.'
    });
  }
});

/**
 * POST /api/ai/parse-marksheet
 * Uses Groq to parse OCR text into structured marksheet data.
 */
router.post('/parse-marksheet', auth, async (req, res) => {
  try {
    const { rawText } = req.body || {};

    if (typeof rawText !== 'string' || !rawText.trim()) {
      return res.status(400).json({
        message: 'rawText is required.'
      });
    }

    const prompt = `Here is raw OCR extracted text from a college semester marksheet:
---
${rawText}
---

Extract the following information accurately in JSON format:
1. studentName: string or "Not detected"
2. registerNumber: string or "Not detected"
3. programme: string or "Not detected"
4. examination: string or "Not detected"
5. semester: integer (1-8) or null
6. sgpa: number or null
7. cgpa: number or null
8. credits: integer or null
9. subjects: array of objects with:
   - code: string
   - name: string
   - grade: string
   - gradePoint: number
   - credit: number

Return ONLY valid JSON matching this schema:
{
  "studentName": "Not detected",
  "registerNumber": "Not detected",
  "programme": "Not detected",
  "examination": "Not detected",
  "semester": null,
  "sgpa": null,
  "cgpa": null,
  "credits": null,
  "subjects": [
    {
      "code": "CS8401",
      "name": "Operating Systems",
      "grade": "A+",
      "gradePoint": 9,
      "credit": 3
    }
  ]
}`;

    const raw = await callGroqAPI(
      [
        {
          role: 'system',
          content:
            'You are an accurate OCR document parsing AI that returns valid JSON only.'
        },
        { role: 'user', content: prompt }
      ],
      0.1,
      1500,
      true
    );

    const parsed = JSON.parse(raw);

    return res.json({
      valid: true,
      rawText,
      ...parsed
    });
  } catch (err) {
    console.error('Groq Marksheet Parse Error:', err.message);

    return res.status(500).json({
      message: 'Failed to parse marksheet with Groq.'
    });
  }
});

module.exports = { router, callGroqAPI };
