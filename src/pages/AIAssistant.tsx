import { API_URL } from '../lib/api';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Trash2,
  Brain,
  MessageSquare,
  HelpCircle,
  Loader2,
  AlertCircle,
  Check,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  { text: 'Analyze my profile', icon: Sparkles },
  { text: 'How can I improve my CGPA?', icon: Brain },
  { text: 'Suggest internships', icon: Sparkles },
  { text: 'Suggest certifications', icon: Sparkles },
  { text: 'Am I placement ready?', icon: HelpCircle },
  { text: 'Generate study plan', icon: Brain },
  { text: 'Generate interview preparation roadmap', icon: Brain },
  { text: 'Generate resume tips', icon: HelpCircle },
];

export function AIAssistant() {
  const { profile, user, token } = useAuth();
  
  // Student Profile Data State for personalization
  const [cgpa, setCgpa] = useState('0.00');
  const [skills, setSkills] = useState<string[]>([]);
  const [projectsCount, setProjectsCount] = useState(0);
  const [internshipsCount, setInternshipsCount] = useState(0);
  const [certsCount, setCertsCount] = useState(0);
  const [hackathonsCount, setHackathonsCount] = useState(0);
  const [workshopsCount, setWorkshopsCount] = useState(0);

  // Chat States
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hello! I am your AI Career & Academic Growth Assistant. I have analyzed your academic records, verified skills, and portfolio. Ask me anything about boosting your CGPA, preparing for placements, selecting certifications, or generating personalized study plans!",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load user data for custom prompt matching
  useEffect(() => {
    if (token && (profile?._id || profile?.id || profile?.user_id || user?.id)) {
      loadProfileDetails();
    }
  }, [token, profile, user]);

  // Auto Scroll to bottom only when new messages are added or when typing
  useEffect(() => {
    if (messages.length > 1 || isTyping) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const loadProfileDetails = async () => {
    const userId = profile?._id || profile?.id || profile?.user_id || user?.id;

    // Read verified CGPA from stored semester performances or verification state
    let verifiedCgpa = '0.00';
    if (userId) {
      const savedSem = localStorage.getItem(`semester_results_data_${userId}`);
      if (savedSem) {
        try {
          const sems = JSON.parse(savedSem);
          const verified = sems.filter((s: any) => s.status === 'Verified' && s.sgpa && (s.credits_total || s.credits_earned || s.credits));
          if (verified.length > 0) {
            const totCred = verified.reduce((acc: number, curr: any) => acc + (curr.credits_total || curr.credits_earned || curr.credits || 0), 0);
            const totPts = verified.reduce((acc: number, curr: any) => acc + ((curr.sgpa || 0) * (curr.credits_total || curr.credits_earned || curr.credits || 0)), 0);
            if (totCred > 0) verifiedCgpa = (totPts / totCred).toFixed(2);
          } else if (sems.some((s: any) => s.cgpa)) {
            const validCgpa = sems.map((s: any) => parseFloat(s.cgpa)).filter((v: number) => !isNaN(v) && v > 0);
            if (validCgpa.length > 0) verifiedCgpa = Math.max(...validCgpa).toFixed(2);
          }
        } catch (e) {
          console.error(e);
        }
      }

      if (verifiedCgpa === '0.00') {
        const savedVerif = localStorage.getItem(`academic_verification_state_${userId}`);
        if (savedVerif) {
          try {
            const parsed = JSON.parse(savedVerif);
            if (parsed.status === 'Verified' && parsed.cgpa) {
              verifiedCgpa = parsed.cgpa.toFixed(2);
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
    }

    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [skillsRes, projectsRes, certsRes, internshipsRes, hackRes, workRes, semRes] = await Promise.all([
        fetch(`${API_URL}/skills`, { headers }),
        fetch(`${API_URL}/projects`, { headers }),
        fetch(`${API_URL}/certifications`, { headers }),
        fetch(`${API_URL}/internships`, { headers }),
        fetch(`${API_URL}/hackathons`, { headers }),
        fetch(`${API_URL}/workshops`, { headers }),
        fetch(`${API_URL}/semesterPerformances`, { headers }),
      ]);

      const [skillsData, projectsData, certsData, internshipsData, hackData, workData, semData] = await Promise.all([
        skillsRes.ok ? skillsRes.json() : [],
        projectsRes.ok ? projectsRes.json() : [],
        certsRes.ok ? certsRes.json() : [],
        internshipsRes.ok ? internshipsRes.json() : [],
        hackRes.ok ? hackRes.json() : [],
        workRes.ok ? workRes.json() : [],
        semRes.ok ? semRes.json() : [],
      ]);

      if (verifiedCgpa === '0.00' && semData.length > 0) {
        const verifiedSems = semData.filter((s: any) => s.sgpa && (s.credits_total || s.credits_earned || s.credits));
        if (verifiedSems.length > 0) {
          const totCred = verifiedSems.reduce((acc: number, curr: any) => acc + (curr.credits_total || curr.credits_earned || curr.credits || 0), 0);
          const totPts = verifiedSems.reduce((acc: number, curr: any) => acc + ((curr.sgpa || 0) * (curr.credits_total || curr.credits_earned || curr.credits || 0)), 0);
          if (totCred > 0) verifiedCgpa = (totPts / totCred).toFixed(2);
        } else {
          const avg = semData.reduce((acc: any, s: any) => acc + (s.sgpa || 0), 0) / semData.length;
          if (avg > 0) verifiedCgpa = avg.toFixed(2);
        }
      }

      setCgpa(verifiedCgpa);
      setSkills(skillsData.map((s: any) => s.skill_name));
      setProjectsCount(projectsData.length);
      setCertsCount(certsData.length);
      setInternshipsCount(internshipsData.length);
      setHackathonsCount(hackData.length);
      setWorkshopsCount(workData.length);
    } catch (err) {
      console.error('Error fetching student details:', err);
    }
  };

  // Generate personalized responses based on loaded student data
  const generateAIResponse = (query: string): string => {
    const q = query.toLowerCase().trim();
    const dept = profile?.department || 'Computer Science & Engineering';
    const sem = profile?.semester || 1;
    const name = profile?.full_name || 'Student';
    const skillsList = skills.length > 0 ? skills.join(', ') : 'No skills listed yet';
    const numCgpa = parseFloat(cgpa) || 0;

    // 1. Profile Analysis
    if (q.includes('analyze') || q.includes('profile') || q.includes('summary') || q.includes('progress') || q.includes('who am i')) {
      return `### Comprehensive Profile Analysis for **${name}**
* **Department:** ${dept} (Semester ${sem})
* **Verified CGPA:** ${cgpa !== '0.00' ? cgpa : 'Pending Semester Upload'}
* **Technical Skills (${skills.length}):** ${skillsList}
* **Portfolio Assets:** ${projectsCount} Projects • ${certsCount} Certifications • ${internshipsCount} Internships • ${hackathonsCount} Hackathons

**Key Performance Evaluation:**
1. **Academic Standing:** Your CGPA of **${cgpa}** is ${numCgpa >= 8.5 ? 'outstanding! You comfortably clear the criteria for Tier-1 product companies.' : numCgpa >= 7.0 ? 'solid! Aiming for 8.0+ in upcoming semesters will maximize placement eligibility.' : 'in development. Focus on core high-credit theory & practicals to elevate it.'}
2. **Hands-on Experience:** You have **${projectsCount} completed projects** and **${internshipsCount} verified internships**. ${internshipsCount > 0 ? 'Your real-world internship exposure gives you a competitive edge.' : 'Securing at least one industry internship before Semester 7 is strongly advised.'}
3. **Skill Diversity:** You have logged *${skills.length} skills*. ${skills.length >= 5 ? 'Your skill distribution is broad and practical.' : 'We recommend adding more specialized backend/cloud proficiencies.'}

**Strategic Action Item:** Focus on completing a full-stack or domain-specific capstone project, verify any remaining semester marksheets, and prepare for upcoming campus recruitment assessments.`;
    }

    // 2. CGPA & Academic Guidance
    if (q.includes('cgpa') || q.includes('grade') || q.includes('improve') || q.includes('score') || q.includes('marks') || q.includes('academic') || q.includes('sgpa')) {
      let targetTip = '';
      if (numCgpa >= 9.0) {
        targetTip = `Outstanding work holding a **${cgpa}** CGPA. To sustain top rank, prioritize elective subject research, assist professors in lab mentorship, and maintain high internal scores.`;
      } else if (numCgpa >= 8.0) {
        targetTip = `Your current CGPA is **${cgpa}**. To enter the **8.8+ bracket**, maximize continuous internal assessment marks, ace practical lab vivas, and target 'O' / 'A+' grades in 4-credit core subjects.`;
      } else if (numCgpa > 0) {
        targetTip = `Your CGPA is **${cgpa}**. Target elevating this to **8.0+** to easily clear cutoff filters for top recruiters. Allocate dedicated daily sprint hours to numerical and programming theory courses.`;
      } else {
        targetTip = `Please upload your semester marksheets under **Semester Results** to automatically calculate your verified CGPA.`;
      }

      return `### Action Plan to Elevate & Maximize CGPA
${targetTip}

**3-Step Semester Optimization Strategy:**
1. **Credit Prioritization:** Identify the 4-credit and 3-credit subjects in Semester ${sem}. Dedicate 60% of your focused study schedule to these high-impact courses.
2. **Internal Assessments (40% Weightage):** Never lose marks in mid-terms, surprise tests, and lab file submissions—these form the easiest foundation for an 'A+' grade.
3. **Previous Year Exam Patterns:** Solve past 5-year university exam question papers 2 weeks prior to finals to master recurring problem patterns.`;
    }

    // 3. Internship Recommendations
    if (q.includes('internship') || q.includes('intern') || q.includes('job') || q.includes('work') || q.includes('company') || q.includes('companies')) {
      return `### Personalized Internship Recommendations
Based on your department (**${dept}**) and current skills (**${skillsList}**):

1. **Full-Stack / Software Engineering Intern**
   - *Target Companies:* Tech startups, SaaS companies, MNCs (e.g., Razorpay, Swiggy, TCS Innovate, Infosys InStep).
   - *Requirements:* Proficiency in React/Next.js, Node.js/Java, and Data Structures.
2. **Cloud & DevOps Engineering Intern**
   - *Target Companies:* Enterprise consulting firms & Cloud solution providers.
   - *Requirements:* Linux fundamentals, Docker, GitHub Actions, AWS/GCP essentials.
3. **Data Science / AI Intern**
   - *Target Companies:* Analytics consulting, AI startups.
   - *Requirements:* Python, Pandas, Machine Learning basics, SQL.

**Next Steps:**
- Polish your top 2 GitHub repositories with comprehensive README files.
- Apply on LinkedIn, Wellfound, and campus career portals.
- **Important:** Once you receive an offer, upload your offer letter to **Student Portal → Internships** for instant verification!`;
    }

    // 4. Certification Guidance
    if (q.includes('cert') || q.includes('course') || q.includes('credential') || q.includes('badge')) {
      return `### High-Impact Certification Roadmap (Semester ${sem})
You currently have **${certsCount} verified certifications**. Here are the highest-ROI certifications for **${dept}**:

1. **Cloud Computing (Highest Industry Demand):**
   - **AWS Certified Cloud Practitioner** or **AWS Certified Solutions Architect Associate**
   - **Google Cloud Associate Cloud Engineer**
2. **Software & Web Engineering:**
   - **Meta Front-End / Back-End Developer Professional Certificate**
   - **MongoDB Certified Associate Developer**
3. **Coding & Problem Solving:**
   - **HackerRank Problem Solving (Intermediate / Advanced)**
   - **Oracle Certified Java Associate (OCAJP)**

*Tip: After finishing a certification, submit the certificate PDF on the **Certificates** page to update your verified growth score.*`;
    }

    // 5. Placement Readiness
    if (q.includes('ready') || q.includes('placement') || q.includes('eligible') || q.includes('campus') || q.includes('drive')) {
      const score = Math.min(
        (numCgpa / 10) * 35 + 
        Math.min(projectsCount * 12, 25) + 
        Math.min(internshipsCount * 15, 20) + 
        Math.min(certsCount * 8, 10) +
        Math.min(skills.length * 2, 10),
        100
      );

      return `### Placement Readiness Assessment
**Calculated Placement Readiness Score: ${score.toFixed(0)}%**

* **Academic Eligibility:** ${numCgpa >= 7.5 ? `✅ Cleared (${cgpa} CGPA)` : `⚠️ Warning (${cgpa} CGPA - Target 7.5+)`}
* **Project Portfolio:** ${projectsCount >= 3 ? `✅ Strong (${projectsCount} Projects)` : `⚠️ Moderate (${projectsCount} Projects - Aim for 3+)`}
* **Industry Internship:** ${internshipsCount > 0 ? `✅ Verified (${internshipsCount} Internships)` : `❌ Needs Work (0 Internships logged)`}
* **Verified Skills:** ${skills.length >= 4 ? `✅ Good (${skills.length} Skills)` : `⚠️ Add more core technical skills`}

**Key Milestones to Reach 100% Placement Readiness:**
1. Complete at least 150 LeetCode problems covering Arrays, Strings, Trees, and DP.
2. Build 1 full-stack capstone project hosted live on Vercel/Render with a working database.
3. Conduct 3 peer mock interviews focusing on CS fundamentals (OOP, DBMS, OS, Networks).`;
    }

    // 6. Study Plan & Time Management
    if (q.includes('study') || q.includes('plan') || q.includes('schedule') || q.includes('routine') || q.includes('time') || q.includes('exam')) {
      return `### Personalized 8-Week Study & Skill Blueprint
Optimized for **Semester ${sem} (${dept})**:

* **Weeks 1–2: Data Structures & Core Theory Foundations**
  - Daily 1.5 hours: DSA (Arrays, Hash Maps, Two Pointers).
  - Daily 1 hour: Semester high-credit subject notes & theory.
* **Weeks 3–4: Core CS Fundamentals & Domain Stack**
  - Daily 1.5 hours: DBMS (SQL queries, indexing) and Object-Oriented Programming.
  - Daily 1 hour: Hands-on feature development on your active project.
* **Weeks 5–6: Advanced Problem Solving & System Design Basics**
  - Daily 1.5 hours: Trees, Graphs, Dynamic Programming fundamentals.
  - Weekly 1 test: Timed online coding assessment simulation.
* **Weeks 7–8: Revision, Lab Records & Final Exam Preparation**
  - Complete all lab records and viva preparation.
  - Solve the last 5 years' university examination papers.`;
    }

    // 7. Interview Prep & DSA Roadmap
    if (q.includes('roadmap') || q.includes('interview') || q.includes('dsa') || q.includes('coding') || q.includes('leetcode') || q.includes('prep')) {
      return `### Comprehensive Technical Interview Preparation Roadmap
Follow this structured 4-pillar interview roadmap:

1. **Pillar 1: Data Structures & Algorithms (DSA)**
   - Master Array, String, Hashing, Stack, Queue, Binary Tree, BST, Graphs, and DP.
   - Solve problems by pattern (Sliding Window, Fast & Slow Pointers, DFS/BFS, Top K Elements).
2. **Pillar 2: Core Computer Science Subjects**
   - **DBMS:** Transactions, ACID properties, Normalization, SQL Joins, Indexing.
   - **OS:** Threads vs Processes, CPU Scheduling, Deadlock conditions, Virtual Memory.
   - **OOP:** Encapsulation, Polymorphism, Abstraction, Inheritance with code examples.
   - **Computer Networks:** TCP/IP, OSI model, HTTP/HTTPS, DNS, WebSockets.
3. **Pillar 3: Project Architecture Defense**
   - Be ready to draw the architecture diagram of your project, justify your tech stack, and explain how you handled authentication, scaling, and error handling.
4. **Pillar 4: Behavioral & HR Round (STAR Method)**
   - Prepare concrete stories for leadership, resolving technical disagreements, and handling project roadblocks.`;
    }

    // 8. Resume Optimization Tips
    if (q.includes('resume') || q.includes('cv') || q.includes('portfolio') || q.includes('github') || q.includes('linkedin')) {
      return `### Top 5 Resume Optimization Strategies for Tech Roles
1. **Quantify Your Achievements (XYZ Formula):**
   - *Instead of:* "Built a web app for college results."
   - *Write:* "Engineered a React & Node.js portal with automated OCR parsing, reducing result processing time by 80% for 500+ students."
2. **Clean Technical Categorization:**
   - Languages: JavaScript, TypeScript, Python, Java, SQL
   - Frameworks: React, Node.js, Express, Tailwind CSS
   - Developer Tools: Git, Docker, Postman, Linux, Vercel
3. **Verified Credentials:**
   - Ensure your CGPA, internships, and certifications match your verified student portal records.
4. **Active GitHub & Live Demos:**
   - Every project on your resume should include both a GitHub link and a live demo deployment URL.
5. **Strict 1-Page Format:**
   - Use clean, ATS-friendly single-column styling with bullet points and bold action verbs.`;
    }

    // 9. Project Ideas & Development
    if (q.includes('project') || q.includes('idea') || q.includes('build') || q.includes('app') || q.includes('stack')) {
      return `### Top Capstone Project Ideas Tailored for ${dept}
Here are 3 production-grade project concepts that stand out on resumes:

1. **AI-Powered Automated Code Reviewer & Security Scanner**
   - *Stack:* React, TypeScript, Node.js, OpenAI API, Docker.
   - *Features:* Analyzes GitHub PRs, suggests performance optimizations, and flags security vulnerabilities.
2. **Real-time Collaborative Whiteboard & System Design Canvas**
   - *Stack:* React, WebSockets / Socket.io, Canvas API, Redis, MongoDB.
   - *Features:* Multi-user live editing, chat, diagram export, and room authentication.
3. **Campus Resource & Placement Management Platform**
   - *Stack:* Full-stack MERN with role-based access control (Student, Staff, Recruiter).
   - *Features:* AI resume verification, placement eligibility analytics, and mock interview scheduler.

*Once built, add it under **Student Portal → Projects** to boost your Technical DNA score!*`;
    }

    // 10. Greetings & General Help
    if (q.includes('hi') || q.includes('hello') || q.includes('hey') || q.includes('help') || q === '') {
      return `Hello **${name}**! 👋

I am your personal **AI Career & Academic Advisor**. Here is what I can do for you:
- 📊 **Analyze your full academic and project profile**
- 📈 **Suggest actionable plans to boost your CGPA**
- 💼 **Recommend matched internships & career roles**
- 📜 **Provide a customized certification roadmap**
- 🎯 **Calculate your campus placement readiness score**
- 💡 **Suggest high-impact software project ideas**
- 📅 **Create structured weekly study and interview schedules**

Feel free to ask a specific question or click any of the **Quick Suggestions** on the left!`;
    }

    // Default conversational response
    return `### AI Career & Growth Advisor Response

Regarding your query: **"${query}"**

Here is tailored advice for you as a **${dept}** student in **Semester ${sem}**:
1. **Academic Connection:** Ensure all your semester marksheets are uploaded under **Semester Results** so your verified CGPA (${cgpa}) accurately reflects on your digital profile.
2. **Technical Skill Enhancement:** Focus on sharpening your core skills (*${skillsList}*) through hands-on project builds and consistent problem-solving on LeetCode/HackerRank.
3. **Next Career Step:** Target adding verified certifications and securing an internship to raise your placement readiness index.

*Feel free to ask about CGPA improvement, interview roadmaps, resume tips, or project ideas!*`;
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isTyping) return;

    const query = textToSend.trim();
    const userMsg: Message = {
      id: `${Date.now()}-user`,
      sender: 'user',
      text: query,
      timestamp: new Date(),
    };

    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages);
    setInputValue('');
    setErrorMessage('');
    setIsTyping(true);

    try {
      const response = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message: query,
          history: currentMessages.slice(-6).map(m => ({
            sender: m.sender,
            text: m.text
          })),
          context: {
            studentName: profile?.full_name || 'Student',
            department: profile?.department || 'Computer Science',
            semester: profile?.semester || 1,
            cgpa,
            skills,
            projectsCount,
            internshipsCount,
            certsCount
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiMsg: Message = {
          id: `${Date.now()}-ai`,
          sender: 'ai',
          text: data.reply || generateAIResponse(query),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const aiResponseText = generateAIResponse(query);
        const aiMsg: Message = {
          id: `${Date.now()}-ai`,
          sender: 'ai',
          text: aiResponseText,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err) {
      console.warn('Groq Chat Fetch fallback:', err);
      const aiResponseText = generateAIResponse(query);
      const aiMsg: Message = {
        id: `${Date.now()}-ai`,
        sender: 'ai',
        text: aiResponseText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim() && !isTyping) {
        handleSendMessage(inputValue);
      }
    }
  };

  const confirmClearHistory = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'ai',
        text: "Hello! I am your AI Career & Academic Growth Assistant. I have analyzed your academic records, verified skills, and portfolio. Ask me anything about boosting your CGPA, preparing for placements, selecting certifications, or generating personalized study plans!",
        timestamp: new Date(),
      },
    ]);
    setShowClearConfirm(false);
    setErrorMessage('');
  };

  // Helper to render markdown lines cleanly
  const renderFormattedText = (txt: string) => {
    const parts = txt.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pIdx} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">AI Growth Assistant</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Get personalized academic, skills, and career guidance powered by student growth intelligence.
          </p>
        </div>
      </div>

      {/* Main Two-Column Layout: Left (~32%) and Right (~68%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: AI Assistant Info & Quick Suggestions */}
        <div className="lg:col-span-4 space-y-5">
          {/* Card 1: AI Assistant Card */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-xl relative overflow-hidden shadow-xl">
            <div className="flex items-start justify-between gap-3 mb-3.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600/30 to-blue-600/30 border border-purple-500/30 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Brain className="w-5 h-5 text-purple-400" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Ready to help
              </span>
            </div>

            <h3 className="text-white font-bold text-base mb-1.5">Your AI Growth Assistant</h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              Your personal counselor analyzes your verified CGPA, portfolio skills, certifications, and internships to craft specialized recommendations.
            </p>

            {/* Student Snapshot Pill */}
            <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-black/30 border border-white/5 mb-4 text-[11px]">
              <div>
                <span className="text-gray-500 block mb-0.5">Verified CGPA</span>
                <span className="font-semibold text-purple-300 text-xs">
                  {cgpa !== '0.00' ? `${cgpa} / 10.0` : 'Pending Upload'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block mb-0.5">Logged Skills</span>
                <span className="font-semibold text-blue-300 text-xs">{skills.length} Technical Skills</span>
              </div>
            </div>

            {/* Clear Chat History with Confirmation Dialog */}
            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-gray-400 hover:text-red-400 transition-all text-xs font-medium cursor-pointer active:scale-[0.98]"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Chat History
              </button>
            ) : (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 space-y-2">
                <p className="text-xs text-red-200 font-semibold">Clear conversation history?</p>
                <p className="text-[11px] text-gray-400 leading-normal">
                  This will reset all messages in the current session.
                </p>
                <div className="flex items-center gap-2 justify-end pt-1">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmClearHistory}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-red-600/30"
                  >
                    <Trash2 className="w-3 h-3" /> Yes, Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Quick Suggestions Card */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <h4 className="text-white font-semibold text-sm">Quick Suggestions</h4>
              </div>
              <span className="text-[10px] text-gray-400 font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                {SUGGESTED_QUESTIONS.length} Topics
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-3.5">
              Select a topic to ask your AI advisor immediately:
            </p>

            {/* Suggestions list: allows multi-line wrapping and internal scrolling */}
            <div className="space-y-2 overflow-y-auto max-h-[360px] pr-1 scroll-smooth">
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q.text)}
                  disabled={isTyping}
                  className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-purple-600/15 border border-white/5 hover:border-purple-500/30 text-xs font-medium text-gray-200 hover:text-white transition-all flex items-start gap-2.5 group cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-6 h-6 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-purple-500/20 transition-colors">
                    <q.icon className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="flex-1 leading-snug whitespace-normal break-words text-gray-300 group-hover:text-white">
                    {q.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Main Chat Panel (~68%) */}
        <div className="lg:col-span-8">
          <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl flex flex-col h-[700px] overflow-hidden relative">
            {/* Subtle Ambient Glow Elements */}
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 bg-gray-950/40 backdrop-blur-md flex items-center justify-between gap-3 relative z-10 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20 flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-bold text-sm truncate">AI Growth Assistant</h3>
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      <Sparkles className="w-2.5 h-2.5" /> Growth Intelligence
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">
                    Real-time academic, placement & career guidance
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="hidden sm:inline">Online &</span> Synced
                </span>
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="px-4 py-2.5 bg-red-950/70 border-b border-red-500/30 flex items-center justify-between text-xs text-red-200 relative z-10">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  onClick={() => setErrorMessage('')}
                  className="text-red-400 hover:text-white text-xs underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5 relative z-10 scroll-smooth min-h-0">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3 shadow-inner">
                    <Bot className="w-7 h-7 text-purple-400" />
                  </div>
                  <h4 className="text-white font-semibold text-base mb-1">How can I help you today?</h4>
                  <p className="text-xs text-gray-400 max-w-sm mb-4">
                    Ask me about your academic performance, placement preparation, certifications, or custom study plans.
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isUser = msg.sender === 'user';
                  const isWelcome = msg.id === 'welcome';
                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex gap-3 max-w-[94%] sm:max-w-[88%] ${
                        isUser ? 'ml-auto flex-row-reverse' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-white shadow-sm mt-0.5 ${
                          isUser
                            ? 'bg-purple-600'
                            : 'bg-gradient-to-br from-purple-600 to-blue-600'
                        }`}
                      >
                        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>

                      {/* Message Bubble */}
                      <div
                        className={`rounded-2xl p-4 text-sm leading-relaxed border shadow-md ${
                          isUser
                            ? 'bg-purple-600/20 border-purple-500/30 text-white rounded-tr-sm'
                            : isWelcome
                            ? 'bg-gradient-to-br from-purple-950/40 via-gray-900/60 to-blue-950/40 border-purple-500/30 text-gray-100 rounded-tl-sm'
                            : 'bg-white/5 border-white/10 text-gray-100 rounded-tl-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 mb-2 pb-1.5 border-b border-white/5">
                          <span className="text-[11px] font-semibold text-purple-300">
                            {isUser ? 'You' : 'AI Growth Assistant'}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {msg.timestamp instanceof Date
                              ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Formatted Markdown Content */}
                        <div className="space-y-1.5 whitespace-pre-wrap leading-relaxed text-xs sm:text-sm">
                          {msg.text.split('\n').map((line, i) => {
                            const cleanLine = line.trim();
                            if (!cleanLine) return <div key={i} className="h-1.5" />;

                            if (cleanLine.startsWith('### ')) {
                              return (
                                <h3 key={i} className="text-white font-bold text-sm md:text-base mt-3 mb-1">
                                  {cleanLine.replace('### ', '')}
                                </h3>
                              );
                            }
                            if (cleanLine.startsWith('## ')) {
                              return (
                                <h2 key={i} className="text-white font-bold text-base md:text-lg mt-3 mb-1">
                                  {cleanLine.replace('## ', '')}
                                </h2>
                              );
                            }
                            if (cleanLine.startsWith('# ')) {
                              return (
                                <h1 key={i} className="text-white font-bold text-lg md:text-xl mt-3 mb-1">
                                  {cleanLine.replace('# ', '')}
                                </h1>
                              );
                            }

                            if (cleanLine.startsWith('- ') || cleanLine.startsWith('* ')) {
                              return (
                                <div key={i} className="flex items-start gap-2 ml-1 text-xs md:text-sm text-gray-200">
                                  <span className="text-purple-400 font-bold">•</span>
                                  <span>{renderFormattedText(cleanLine.substring(2))}</span>
                                </div>
                              );
                            }

                            if (/^[0-9]+\.\s/.test(cleanLine)) {
                              return (
                                <div key={i} className="flex items-start gap-2 ml-1 text-xs md:text-sm text-gray-200">
                                  <span className="text-purple-400 font-semibold">{cleanLine.match(/^[0-9]+\./)?.[0]}</span>
                                  <span>{renderFormattedText(cleanLine.replace(/^[0-9]+\.\s*/, ''))}</span>
                                </div>
                              );
                            }

                            return (
                              <p key={i} className="text-xs md:text-sm text-gray-200">
                                {renderFormattedText(cleanLine)}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white flex-shrink-0 shadow-sm mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm p-3.5 bg-white/5 border border-white/10 flex items-center gap-2 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <motion.div
                        className="w-2 h-2 rounded-full bg-purple-400"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                      />
                      <motion.div
                        className="w-2 h-2 rounded-full bg-purple-400"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                      />
                      <motion.div
                        className="w-2 h-2 rounded-full bg-blue-400"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 ml-1">AI Growth Assistant is thinking...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Mobile Horizontal Quick Suggestion Pills */}
            <div className="px-4 py-2 border-t border-white/5 flex gap-2 overflow-x-auto lg:hidden relative z-10 scrollbar-none bg-gray-950/40 flex-shrink-0">
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q.text)}
                  disabled={isTyping}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-gray-300 hover:text-white transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <q.icon className="w-3 h-3 text-purple-400" />
                  <span>{q.text}</span>
                </button>
              ))}
            </div>

            {/* Chat Input Section */}
            <div className="p-3.5 sm:p-4 border-t border-white/10 bg-gray-950/50 backdrop-blur-md relative z-10 flex-shrink-0">
              <div className="flex items-end gap-2.5 bg-white/5 border border-white/10 focus-within:border-purple-500/50 rounded-2xl p-2 transition-colors shadow-inner">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about improving CGPA, placement readiness, certifications, study plans..."
                  rows={1}
                  disabled={isTyping}
                  className="flex-1 bg-transparent px-3 py-2 text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none resize-none max-h-32 min-h-[40px] leading-relaxed"
                />
                <button
                  onClick={() => handleSendMessage(inputValue)}
                  disabled={!inputValue.trim() || isTyping}
                  className={`p-2.5 rounded-xl transition-all flex items-center justify-center flex-shrink-0 ${
                    inputValue.trim() && !isTyping
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-600/30 cursor-pointer active:scale-95'
                      : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                  }`}
                  title="Send message (Enter)"
                >
                  {isTyping ? <Loader2 className="w-5 h-5 animate-spin text-purple-400" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2 px-1">
                <span>
                  Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-[10px]">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-[10px]">Shift + Enter</kbd> for newline
                </span>
                <span className="hidden sm:inline text-purple-400/80 font-medium">Beyond Grades AI</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIAssistant;
