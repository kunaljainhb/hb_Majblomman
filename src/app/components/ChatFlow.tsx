import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
export interface Child {
  firstName: string; lastName: string;
  idType: 'personal_number' | 'coordination_number' | 'lma_number' | 'other' | '';
  idNumber: string;
}
export interface SupportRequest { childIndex: number; type: string; description: string; benefit: string; }
export interface IncomeSource { received: boolean | null; amount: number; }
export interface FormData {
  eligibility: { under18: boolean | null; hasIncomeInfo: boolean | null; knowsSupportReason: boolean | null; hasCertificateWriter: boolean | null; hasProtectedIdentity: boolean | null; };
  previousSupport: { received: boolean | null };
  certificate: { method: 'upload' | 'manual' | ''; uploadedFiles: string[]; writer: { firstName: string; lastName: string; role: string; email: string; phone: string }; };
  children: Child[];
  guardians: { guardian1: { firstName: string; lastName: string }; guardian2: { firstName: string; lastName: string }; hasGuardian2: boolean; };
  address: { householdChildrenCount: number | null; street: string; postalCode: string; city: string; apartmentNumber: string; coAddress: string; };
  contact: { email: string; confirmEmail: string; phone: string };
  bankDetails: { hasBankDetails: boolean | null; bankName: string; accountHolder: string; clearingNumber: string; accountNumber: string; };
  income: { childAllowance: IncomeSource; parentalBenefit: IncomeSource; studyAllowance: IncomeSource; maintenanceSupport: IncomeSource; careAllowance: IncomeSource; unemploymentBenefit: IncomeSource; housingAllowance: IncomeSource; sicknessBenefit: IncomeSource; incomeSupport: IncomeSource; salary: IncomeSource; otherIncome: IncomeSource; };
  familySituation: string; supportRequests: SupportRequest[];
  consent: { processData: boolean; correctInformation: boolean };
}
export interface ChatFlowProps { formData: FormData; updateData: (u: Partial<FormData>) => void; onComplete: () => void; language: 'en' | 'sv'; }

// ─────────────────────────────────────────────
// SECTIONS (9 total)
// ─────────────────────────────────────────────
const SECTIONS_EN = [
  'Eligibility & History',
  'Application Details',
  'Income & Support',
  'Documents & Review',
];
const SECTIONS_SV = [
  'Behörighet & Historik',
  'Ansökningsuppgifter',
  'Inkomst & Stöd',
  'Dokument & Granskning',
];

// ─────────────────────────────────────────────
// QUESTION STEP DEFINITION
// ─────────────────────────────────────────────
type QType = 'text' | 'radio' | 'select' | 'multiselect' | 'file' | 'info';

interface Step {
  id: string;
  section: number;         // 0-indexed section
  type: QType;
  prompt: string;
  options?: string[];
  optional?: boolean;
  skipIf?: (ans: Record<string, any>) => boolean;   // if true, skip this step
  postProcess?: (val: string | string[], ans: Record<string, any>) => Record<string, any>;
  // for per-child loops we'll handle dynamically
}

// All steps in order. Dynamic (per-child) steps are generated at runtime.
const BASE_STEPS: Step[] = [
  // ── SECTION 1: ELIGIBILITY & HISTORY ──
  { id: 'elig_under18',      section: 0, type: 'radio',  prompt: 'Are the children you are applying for 18 years old or younger?', options: ['Yes', 'No'] },
  { id: 'elig_income',       section: 0, type: 'radio',  prompt: 'Do you have information about your household\'s combined monthly income?', options: ['Yes', 'No'] },
  { id: 'elig_support',      section: 0, type: 'radio',  prompt: 'Do you know what support you would like to apply for?', options: ['Yes', 'No'] },
  { id: 'elig_cert_writer',  section: 0, type: 'radio',  prompt: 'Have you already contacted a person who can provide a certificate supporting the child\'s need?', options: ['Yes', 'No'] },
  { id: 'elig_protected',    section: 0, type: 'radio',  prompt: 'Do you have a protected identity?', options: ['Yes', 'No'] },
  { id: 'elig_meets_req',    section: 0, type: 'radio',  prompt: 'Do you meet all the requirements to apply for financial support from Majblomman?', options: ['Yes', 'No'] },
  { id: 'prev_received',     section: 0, type: 'radio',  prompt: 'Have any of the children received financial support from Majblomman during the last 12 months?', options: ['Yes', 'No'] },

  // ── SECTION 2: APPLICATION DETAILS ──
  { id: 'cert_method',       section: 1, type: 'radio',  prompt: 'How would you like to provide the certificate?', options: ['Upload Certificate', 'Enter Certificate Writer Details'] },
  { id: 'cert_upload',       section: 1, type: 'file',   prompt: 'Please upload the certificate document (PDF, JPG or PNG).', skipIf: a => a['cert_method'] !== 'Upload Certificate' },
  { id: 'cert_name',         section: 1, type: 'text',   prompt: 'What is the full name of the certificate writer?', skipIf: a => a['cert_method'] === 'Upload Certificate' },
  { id: 'cert_role',         section: 1, type: 'text',   prompt: 'What is the professional role of the certificate writer in relation to the child?', skipIf: a => a['cert_method'] === 'Upload Certificate' },
  { id: 'cert_email',        section: 1, type: 'text',   prompt: 'What is the email address of the certificate writer?', skipIf: a => a['cert_method'] === 'Upload Certificate' },
  { id: 'cert_phone',        section: 1, type: 'text',   prompt: 'What is the phone number of the certificate writer?', skipIf: a => a['cert_method'] === 'Upload Certificate' },
  { id: 'child_count',       section: 1, type: 'text',   prompt: 'How many children are you applying for?' },
  // Per-child steps generated dynamically at runtime
  { id: 'g1_name',           section: 1, type: 'text',   prompt: 'What is your full name?' },
  { id: 'has_g2',            section: 1, type: 'radio',  prompt: 'Is there a second guardian?', options: ['Yes', 'No'] },
  { id: 'g2_name',           section: 1, type: 'text',   prompt: 'What is the second guardian\'s full name?', skipIf: a => a['has_g2'] !== 'Yes' },

  { id: 'addr_street',       section: 1, type: 'text',   prompt: 'What is your home address?' },
  { id: 'addr_postal',       section: 1, type: 'text',   prompt: 'What is your postal code?' },
  { id: 'addr_city',         section: 1, type: 'text',   prompt: 'What city do you live in?' },
  { id: 'addr_apt',          section: 1, type: 'text',   prompt: 'What is your apartment number?', optional: true },
  { id: 'addr_co',           section: 1, type: 'text',   prompt: 'What is your C/O address?', optional: true },
  { id: 'contact_email',     section: 1, type: 'text',   prompt: 'What is your email address?' },
  { id: 'contact_phone',     section: 1, type: 'text',   prompt: 'What is your phone number?' },
  { id: 'bank_want',         section: 1, type: 'radio',  prompt: 'Would you like to provide bank details?', options: ['Yes', 'Skip'] },
  { id: 'bank_name',         section: 1, type: 'text',   prompt: 'What is the name of your bank?', skipIf: a => a['bank_want'] !== 'Yes' },
  { id: 'bank_holder',       section: 1, type: 'text',   prompt: 'What is the account holder\'s name?', skipIf: a => a['bank_want'] !== 'Yes' },
  { id: 'bank_clearing',     section: 1, type: 'text',   prompt: 'What is the clearing number?', skipIf: a => a['bank_want'] !== 'Yes' },
  { id: 'bank_account',      section: 1, type: 'text',   prompt: 'What is the account number?', skipIf: a => a['bank_want'] !== 'Yes' },

  // ── SECTION 3: INCOME & SUPPORT ──
  { id: 'income_sources',    section: 2, type: 'multiselect', prompt: 'Which of the following income sources does your household receive?',
    options: ['Salary', 'Child Allowance', 'Parental Benefit', 'Study Allowance', 'Maintenance Support', 'Care Allowance', 'Unemployment Benefit', 'Housing Allowance', 'Sickness Benefit', 'Income Support', 'Other Income'] },
  // Amount steps generated dynamically based on income_sources selection
  { id: 'support_situation', section: 2, type: 'text',   prompt: 'Please describe your family\'s current situation.' },
  { id: 'support_type',      section: 2, type: 'select', prompt: 'What type of support are you requesting for the child?',
    options: ['Football Shoes', 'School Equipment', 'Clothing', 'Bus Pass', 'Leisure Activity', 'Camp', 'Sports Membership', 'Other'] },
  { id: 'support_desc',      section: 2, type: 'text',   prompt: 'Please describe the support being requested.' },
  { id: 'support_benefit',   section: 2, type: 'text',   prompt: 'Why would this support benefit the child?' },
  { id: 'support_more',      section: 2, type: 'radio',  prompt: 'Would you like to add another support request?', options: ['Yes', 'No'] },

  // ── SECTION 4: DOCUMENTS & REVIEW ──
  { id: 'docs_upload',       section: 3, type: 'radio',  prompt: 'Would you like to upload any additional supporting documents?', options: ['Upload Document', 'Skip'] },
  { id: 'docs_file',         section: 3, type: 'file',   prompt: 'Please upload the supporting document.', skipIf: a => a['docs_upload'] !== 'Upload Document' },
  { id: 'review_info',       section: 3, type: 'info',   prompt: 'Please review the information collected. Your responses have been saved and are ready for submission.' },
  { id: 'consent_data',      section: 3, type: 'radio',  prompt: 'Do you agree that Majblomman may process your personal data?', options: ['Yes', 'No'] },
  { id: 'consent_accurate',  section: 3, type: 'radio',  prompt: 'Do you confirm that the information provided is accurate and supported by relevant documentation?', options: ['Yes', 'No'] },
];

// ─────────────────────────────────────────────
// HELP FAQ
// ─────────────────────────────────────────────
const QUICK_QUESTIONS_EN = [
  'Who can write the certificate?',
  'What is a coordination number?',
  'What documents are required?',
  'How do I calculate household income?',
  'What support can I apply for?',
];
const QUICK_QUESTIONS_SV = [
  'Vem kan skriva intyget?',
  'Vad är ett samordningsnummer?',
  'Vilka dokument krävs?',
  'Hur beräknar jag hushållets inkomst?',
  'Vilket stöd kan jag ansöka om?',
];

const FAQ_ANSWERS: Record<string, string> = {
  'who can write the certificate': 'A professional who knows the child — such as a teacher, school nurse, doctor, or social worker — can write the certificate.',
  'vem kan skriva intyget': 'En yrkesperson som känner barnet – t.ex. lärare, skolsköterska, läkare eller socialarbetare – kan skriva intyget.',
  'what is a coordination number': 'A coordination number (samordningsnummer) is a temporary identification number for persons without a Swedish personal number.',
  'vad är ett samordningsnummer': 'Ett samordningsnummer är en tillfällig identitetsbeteckning för personer utan personnummer.',
  'what documents are required': 'You will need: a certificate from a professional, proof of income for all adults, and identification for each child.',
  'vilka dokument krävs': 'Du behöver: ett intyg från en yrkesperson, inkomstbevis för alla vuxna och legitimation för varje barn.',
  'how do i calculate household income': 'Add together all monthly incomes: salaries, allowances, parental benefit, housing allowance, and any other benefits received by adults in the household.',
  'hur beräknar jag hushållets inkomst': 'Lägg ihop alla månatliga inkomster: löner, bidrag, föräldrapenning, bostadsbidrag och övriga ersättningar för vuxna i hushållet.',
  'what support can i apply for': 'You can apply for: Football Shoes, School Equipment, Clothing, Bus Pass, Leisure Activity, Camp, Sports Membership, or Other.',
  'vilket stöd kan jag ansöka om': 'Du kan ansöka om: fotbollsskor, skolmaterial, kläder, busskort, fritidsaktivitet, läger, sportmedlemskap eller annat.',
};

function getHelpAnswer(q: string): string {
  const low = q.toLowerCase();
  for (const [k, v] of Object.entries(FAQ_ANSWERS)) {
    if (low.includes(k)) return v;
  }
  return "I'm here to help! Please ask any question about the Majblomman application process and I'll do my best to answer.";
}

// ─────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────
const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const AttachIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
  </svg>
);
const MicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);
const ChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 opacity-50">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
);
const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[#5b5ef4]">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
    <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const TrophyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-yellow-500">
    <path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/>
    <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0012 0V2z"/>
  </svg>
);

const BotAvatar = () => (
  <div className="w-16 h-16 mx-auto mb-3 flex items-center justify-center">
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="30" fill="#EEF0FF"/>
      <rect x="18" y="28" width="28" height="20" rx="5" fill="#5b5ef4"/>
      <rect x="20" y="14" width="24" height="20" rx="6" fill="#7c7ef7"/>
      <line x1="32" y1="14" x2="32" y2="8" stroke="#7c7ef7" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="32" cy="6" r="2.5" fill="#f5c842"/>
      <circle cx="26" cy="23" r="3" fill="white"/>
      <circle cx="38" cy="23" r="3" fill="white"/>
      <circle cx="26.8" cy="23.8" r="1.5" fill="#1e1b8e"/>
      <circle cx="38.8" cy="23.8" r="1.5" fill="#1e1b8e"/>
      <path d="M26 30 Q32 34 38 30" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <rect x="10" y="31" width="8" height="5" rx="2.5" fill="#5b5ef4"/>
      <rect x="46" y="31" width="8" height="5" rx="2.5" fill="#5b5ef4"/>
      <circle cx="27" cy="38" r="2" fill="#a5b4fc"/>
      <circle cx="32" cy="38" r="2" fill="#a5b4fc"/>
      <circle cx="37" cy="38" r="2" fill="#a5b4fc"/>
    </svg>
  </div>
);

const BotBubbleIcon = () => (
  <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0 shadow-sm">
    <svg width="18" height="18" viewBox="0 0 64 64" fill="none">
      <rect x="18" y="28" width="28" height="20" rx="5" fill="white" opacity="0.8"/>
      <rect x="20" y="14" width="24" height="20" rx="6" fill="white"/>
      <circle cx="26" cy="23" r="2.5" fill="#f5c842"/>
      <circle cx="38" cy="23" r="2.5" fill="#f5c842"/>
      <circle cx="26.8" cy="23.8" r="1" fill="#1e1b8e"/>
      <circle cx="38.8" cy="23.8" r="1" fill="#1e1b8e"/>
    </svg>
  </div>
);

const UserAvatar = () => (
  <div className="w-8 h-8 rounded-full bg-[#f5c842] flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" fill="#a0522d"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="#c68642"/>
    </svg>
  </div>
);

const TypingDots = () => (
  <div className="flex items-center gap-1 py-1">
    {[0,1,2].map(i => (
      <motion.div key={i} className="w-2 h-2 rounded-full bg-[#5b5ef4]"
        animate={{ y: [0,-4,0] }} transition={{ duration:0.6, repeat:Infinity, delay: i*0.15 }}/>
    ))}
  </div>
);

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
type Msg = { id: string; from: 'ai' | 'user'; text: string; time: string; options?: string[]; type?: QType; stepId?: string; };

export function ChatFlow({ formData, updateData, onComplete, language }: ChatFlowProps) {
  const sections = language === 'en' ? SECTIONS_EN : SECTIONS_SV;
  const quickQs  = language === 'en' ? QUICK_QUESTIONS_EN : QUICK_QUESTIONS_SV;

  const uid = () => Math.random().toString(36).slice(2);
  const ts  = () => new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });

  // Answers store
  const [answers, setAnswers]         = useState<Record<string, any>>({});
  // Flat ordered list of active steps (BASE_STEPS expanded with dynamic per-child + per-income steps)
  const [steps, setSteps]             = useState<Step[]>([...BASE_STEPS]);
  // Index into `steps` of the NEXT step to present
  const [stepIdx, setStepIdx]         = useState(0);
  // Which section index is active (for left sidebar)
  const [activeSection, setActiveSection] = useState(0);
  // Which sections are completed
  const [completed, setCompleted]     = useState<boolean[]>(Array(4).fill(false));

  // Conversation state
  const [conv, setConv]               = useState<Msg[]>([{
    id: uid(), from: 'ai', time: ts(),
    text: "Hello! Welcome to Majblomman's Application Assistant.\n\nI'm here to help you apply for financial support for your family. The process usually takes about 10 minutes to complete, and I'll guide you through each step.",
  }]);
  const [typing, setTyping]           = useState(false);
  const [inputVal, setInputVal]       = useState('');
  const [selectVal, setSelectVal]     = useState('');
  const [multiSel, setMultiSel]       = useState<string[]>([]);

  // Help panel
  const [helpConv, setHelpConv]       = useState<Msg[]>([]);
  const [helpInput, setHelpInput]     = useState('');

  // Support request loop tracking
  const [supportRound, setSupportRound] = useState(1);
  // Per-child loop tracking
  const [childTotal, setChildTotal]   = useState(0);
  const [childRound, setChildRound]   = useState(1);

  const convEndRef  = useRef<HTMLDivElement>(null);
  const helpEndRef  = useRef<HTMLDivElement>(null);
  const fileRef     = useRef<HTMLInputElement>(null);
  const docsFileRef = useRef<HTMLInputElement>(null);

  // ── Voice mode state ──
  const [voiceMode, setVoiceMode]     = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const recognitionRef = useRef<any>(null);

  // Text-to-speech: speak a string if voice mode is active
  const speak = useCallback((text: string) => {
    if (!voiceMode) return;
    window.speechSynthesis?.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    utter.rate = 0.95;
    utter.pitch = 1;
    utter.onstart = () => setIsSpeaking(true);
    utter.onend   = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utter);
  }, [voiceMode]);

  // Auto-speak newest AI message whenever conv changes
  useEffect(() => {
    if (!voiceMode) return;
    const last = conv[conv.length - 1];
    if (last?.from === 'ai') speak(last.text);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv, voiceMode]);

  // Stop speech when voice mode turns off
  useEffect(() => {
    if (!voiceMode) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
      stopListening();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceMode]);

  // Start speech recognition
  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.'); return; }
    window.speechSynthesis?.cancel(); // stop TTS before listening
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart  = () => setIsListening(true);
    recognition.onend    = () => setIsListening(false);
    recognition.onerror  = () => setIsListening(false);
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInputVal(transcript);
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  useEffect(() => { convEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [conv, typing]);
  useEffect(() => { helpEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [helpConv]);

  // Each mount of ChatFlow gets its own session key so a reset (key change)
  // always starts from a completely blank slate — never inheriting old progress.
  const sessionKey = useRef(`mjb_session_${Date.now()}`);

  // Persist current progress mid-session (survives a page refresh, not a reset)
  useEffect(() => {
    localStorage.setItem(sessionKey.current, JSON.stringify({ answers, completed }));
  }, [answers, completed]);

  // Cleanup: remove this session's data when the component unmounts (i.e. on reset)
  useEffect(() => {
    return () => { localStorage.removeItem(sessionKey.current); };
  }, []);

  // Progress %
  const progressPct = Math.round((completed.filter(Boolean).length / 4) * 100);

  // ── Expand dynamic steps (per-child, per-income-source) ──
  const expandSteps = useCallback((ans: Record<string, any>, currentSteps: Step[]): Step[] => {
    const count = parseInt(ans['child_count'] || '1', 10) || 1;
    const incSources: string[] = ans['income_sources'] || [];

    // Build the full list by processing BASE_STEPS and inserting dynamic ones
    const result: Step[] = [];
    for (const step of BASE_STEPS) {
      result.push(step);

      // After child_count, insert per-child questions
      if (step.id === 'child_count') {
        for (let ci = 1; ci <= count; ci++) {
          result.push({ id: `child_${ci}_name`, section: 1, type: 'text', prompt: `What is child ${ci}'s full name?` });
          result.push({ id: `child_${ci}_idtype`, section: 1, type: 'radio', prompt: `Which identification type does child ${ci} have?`, options: ['Personal Identity Number','Coordination Number','LMA Number','Other'] });
          result.push({ id: `child_${ci}_idnum`, section: 1, type: 'text',  prompt: `Please enter the identification number for child ${ci}.` });
        }
      }

      // After income_sources, insert amount questions for each selected source
      if (step.id === 'income_sources' && incSources.length > 0) {
        for (const src of incSources) {
          result.push({ id: `income_amt_${src.replace(/\s+/g,'_').toLowerCase()}`, section: 2, type: 'text', prompt: `Please enter the monthly amount received for "${src}" (SEK).` });
        }
      }

      // After support_more, if Yes, repeat the support block (handled in submitAnswer logic)
    }
    return result;
  }, []);

  // Kick off first question after mount
  useEffect(() => {
    const s = expandSteps({}, BASE_STEPS);
    setSteps(s);
    // Ask first real step
    setTimeout(() => askStep(s, 0, {}), 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Ask a step ──
  const askStep = useCallback((stps: Step[], idx: number, ans: Record<string, any>) => {
    if (idx >= stps.length) return;
    const step = stps[idx];

    // Skip?
    if (step.skipIf && step.skipIf(ans)) {
      askStep(stps, idx + 1, ans);
      return;
    }

    setActiveSection(step.section);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setSelectVal('');
      setMultiSel([]);
      setInputVal('');
      setConv(prev => [...prev, {
        id: uid(), from: 'ai', time: ts(),
        text: step.prompt,
        options: step.options,
        type: step.type,
        stepId: step.id,
      }]);
    }, 750);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Submit answer ──
  const submitAnswer = useCallback((value: string | string[], overrideSteps?: Step[]) => {
    const stps = overrideSteps || steps;
    const step = stps[stepIdx];
    if (!step) return;

    const displayValue = Array.isArray(value) ? value.join(', ') : value;

    // Save
    const newAns = { ...answers, [step.id]: value };
    setAnswers(newAns);
    setInputVal(''); setSelectVal(''); setMultiSel([]);

    // Add user bubble
    setConv(prev => [...prev, { id: uid(), from: 'user', time: ts(), text: displayValue }]);

    // Possibly re-expand steps now that we have more info
    let newSteps = stps;
    if (step.id === 'child_count' || step.id === 'income_sources') {
      newSteps = expandSteps(newAns, BASE_STEPS);
      setSteps(newSteps);
      if (step.id === 'child_count') {
        setChildTotal(parseInt(String(value) || '1', 10) || 1);
      }
    }

    // Handle support_more loop – re-insert support steps
    if (step.id === 'support_more' && value === 'Yes') {
      const nextRound = supportRound + 1;
      setSupportRound(nextRound);
      const extraSteps: Step[] = [
        { id: `support_type_${nextRound}`,    section: 2, type: 'select', prompt: `What type of support are you requesting? (Request ${nextRound})`, options: ['Football Shoes','School Equipment','Clothing','Bus Pass','Leisure Activity','Camp','Sports Membership','Other'] },
        { id: `support_desc_${nextRound}`,    section: 2, type: 'text',   prompt: `Please describe the support being requested. (Request ${nextRound})` },
        { id: `support_benefit_${nextRound}`, section: 2, type: 'text',   prompt: `Why would this support benefit the child? (Request ${nextRound})` },
        { id: `support_more_${nextRound}`,    section: 2, type: 'radio',  prompt: 'Would you like to add another support request?', options: ['Yes','No'] },
      ];
      const insertAt = stepIdx + 1;
      const spliced = [...newSteps.slice(0, insertAt), ...extraSteps, ...newSteps.slice(insertAt)];
      setSteps(spliced);
      newSteps = spliced;
    }

    // Determine next step
    let nextIdx = stepIdx + 1;

    // Mark section complete when transitioning to next section
    const currentSection = step.section;
    const nextStep = newSteps[nextIdx];
    if (nextStep && nextStep.section !== currentSection) {
      setCompleted(prev => { const n=[...prev]; n[currentSection]=true; return n; });
    } else if (!nextStep) {
      // Finished all steps – mark final section
      setCompleted(prev => { const n=[...prev]; n[currentSection]=true; return n; });
    }

    setStepIdx(nextIdx);
    askStep(newSteps, nextIdx, newAns);

    // Final completion bubble
    if (nextIdx >= newSteps.length) {
      setTimeout(() => {
        setConv(prev => [...prev, {
          id: uid(), from: 'ai', time: ts(),
          text: "Thank you.\n\nYour application has been completed successfully.\n\nPlease click Submit Application to send your application to Majblomman for review.",
        }]);
      }, 1200);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, stepIdx, answers, expandSteps, supportRound]);

  // Current active step for input rendering
  const currentStep = steps[stepIdx];
  // Which step is awaiting input = the last AI bubble
  const lastAiMsg = [...conv].reverse().find(m => m.from === 'ai');
  const activeStepId = lastAiMsg?.stepId;
  const activeStep = steps.find(s => s.id === activeStepId) || currentStep;

  // ── Help assistant ──
  const submitHelp = (q?: string) => {
    const query = q ?? helpInput.trim();
    if (!query) return;
    setHelpConv(prev => [...prev, { id: uid(), from: 'user', time: ts(), text: query }]);
    setHelpInput('');
    setTimeout(() => {
      setHelpConv(prev => [...prev, { id: uid(), from: 'ai', time: ts(), text: getHelpAnswer(query) }]);
    }, 500);
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'Plus Jakarta Sans', system-ui, sans-serif" }} className="w-full">
      <div className="max-w-[1280px] mx-auto px-4 pt-5 pb-4 grid grid-cols-[260px_1fr_260px] gap-4 h-[calc(100vh-140px)] min-h-[600px]">

        {/* ══ LEFT: Application Progress ══ */}
        <aside className="bg-white rounded-2xl shadow-sm border border-[#e8e8f0] flex flex-col overflow-hidden">
          <div className="p-5 pb-3">
            <h2 className="text-[15px] font-semibold text-[#1a1a2e]">Application Progress</h2>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 pb-3">
            <ul className="space-y-1">
              {sections.map((name, idx) => {
                const isActive = idx === activeSection;
                const isDone   = completed[idx];
                const canNav   = isDone || idx <= activeSection;
                return (
                  <li key={idx}>
                    <button
                      onClick={() => canNav ? setActiveSection(idx) : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                        isActive ? 'bg-[#5b5ef4] text-white shadow-md shadow-[#5b5ef4]/25'
                        : canNav  ? 'hover:bg-[#f0f0ff] text-[#3a3a5c] cursor-pointer'
                        : 'text-[#b0b0c8] cursor-default'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                        isActive ? 'bg-white text-[#5b5ef4]'
                        : isDone  ? 'bg-[#22c55e] text-white'
                        : 'border-2 border-[#d0d0e8] text-[#9090b0]'
                      }`}>
                        {isDone && !isActive ? <CheckIcon /> : idx + 1}
                      </span>
                      <span className={`text-[13px] font-medium flex-1 leading-tight`}>{name}</span>
                      {isActive && <ChevronRight />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Trophy progress card */}
          <div className="mx-3 mb-3 bg-[#fefce8] border border-yellow-100 rounded-xl p-4 flex items-center gap-3">
            <TrophyIcon />
            <div>
              <p className="text-sm font-bold text-[#1a1a2e]">{progressPct}% complete</p>
              <p className="text-xs text-[#6b7280]">{progressPct === 0 ? "Let's get started!" : progressPct < 100 ? 'Keep going!' : 'All done! 🎉'}</p>
            </div>
          </div>
        </aside>

        {/* ══ CENTER: AI Guided Application ══ */}
        <section className="bg-white rounded-2xl shadow-sm border border-[#e8e8f0] flex flex-col overflow-hidden">
          {/* Section header */}
          <div className="px-5 pt-4 pb-3 border-b border-[#f0f0f8]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#5b5ef4] uppercase tracking-wider">{sections[activeSection]}</p>
              {/* Text / Voice toggle */}
              <div className="flex items-center gap-1 bg-[#f0f0ff] rounded-xl p-0.5">
                <button
                  onClick={() => setVoiceMode(false)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[12px] font-semibold transition-all ${
                    !voiceMode ? 'bg-white text-[#5b5ef4] shadow-sm' : 'text-[#9090b0] hover:text-[#5b5ef4]'
                  }`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  Text
                </button>
                <button
                  onClick={() => setVoiceMode(true)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[12px] font-semibold transition-all ${
                    voiceMode ? 'bg-white text-[#5b5ef4] shadow-sm' : 'text-[#9090b0] hover:text-[#5b5ef4]'
                  }`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                  Voice
                </button>
              </div>
            </div>

          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <AnimatePresence initial={false}>
              {conv.map((msg) => (
                <motion.div key={msg.id}
                  initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.25 }}
                  className={`flex items-end gap-2 ${msg.from==='user'?'flex-row-reverse':''}`}
                >
                  {msg.from==='ai' ? <BotBubbleIcon /> : <UserAvatar />}
                  <div className={`max-w-[75%] flex flex-col ${msg.from==='user'?'items-end':'items-start'}`}>
                    <div className={`px-4 py-3 rounded-2xl text-[13.5px] leading-relaxed whitespace-pre-line shadow-sm ${
                      msg.from==='ai'
                        ? 'bg-[#f7f7ff] text-[#1a1a2e] rounded-bl-sm border border-[#ededff]'
                        : 'bg-[#5b5ef4] text-white rounded-br-sm'
                    }`}>
                      {msg.text}

                      {/* Inline radio buttons */}
                      {msg.from==='ai' && msg.type==='radio' && msg.options && msg.stepId===activeStepId && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {msg.options.map(opt => (
                            <button key={opt} onClick={() => submitAnswer(opt)}
                              className="px-4 py-1.5 rounded-lg border text-[13px] font-medium bg-white text-[#3a3a5c] border-[#d0d0e8] hover:border-[#5b5ef4] hover:bg-[#f0f0ff] transition-all">
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Info step – just show Continue button */}
                      {msg.from==='ai' && msg.type==='info' && msg.stepId===activeStepId && (
                        <div className="mt-3">
                          <button onClick={() => submitAnswer('acknowledged')}
                            className="px-4 py-2 rounded-lg bg-[#5b5ef4] text-white text-[13px] font-medium hover:bg-[#4a4de0] transition-colors">
                            Continue
                          </button>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-[#b0b0c8] mt-1 px-1">{msg.time}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            <AnimatePresence>
              {typing && (
                <motion.div key="typing" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="flex items-end gap-2">
                  <BotBubbleIcon />
                  <div className="bg-[#f7f7ff] border border-[#ededff] rounded-2xl rounded-bl-sm px-4 py-3">
                    <TypingDots />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={convEndRef}/>
          </div>

          {/* Input area */}
          <div className="border-t border-[#f0f0f8] px-4 py-3 space-y-2">
            {/* Multi-select */}
            {activeStep?.type === 'multiselect' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto">
                  {activeStep.options?.map(opt => {
                    const sel = multiSel.includes(opt);
                    return (
                      <button key={opt}
                        onClick={() => setMultiSel(prev => sel ? prev.filter(x=>x!==opt) : [...prev, opt])}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[12.5px] text-left font-medium transition-all ${
                          sel ? 'bg-[#5b5ef4] text-white border-[#5b5ef4]' : 'bg-[#fafafe] text-[#3a3a5c] border-[#e0e0f0] hover:border-[#5b5ef4]'
                        }`}>
                        <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${sel ? 'bg-white border-white' : 'border-[#c0c0d8]'}`}>
                          {sel && <svg viewBox="0 0 10 10" className="w-2.5 h-2.5"><polyline points="1,5 4,8 9,2" stroke="#5b5ef4" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
                <button disabled={multiSel.length === 0}
                  onClick={() => submitAnswer(multiSel)}
                  className="w-full py-2 rounded-xl bg-[#5b5ef4] text-white text-[13px] font-semibold disabled:opacity-40 hover:bg-[#4a4de0] transition-colors">
                  Confirm Selection ({multiSel.length} selected)
                </button>
              </div>
            )}

            {/* Select dropdown */}
            {activeStep?.type === 'select' && (
              <div className="flex gap-2">
                <select value={selectVal} onChange={e => setSelectVal(e.target.value)}
                  className="flex-1 border border-[#e0e0f0] rounded-xl px-3 py-2 text-[13.5px] text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#5b5ef4]/30 bg-[#fafafe]">
                  <option value="" disabled>Select an option…</option>
                  {activeStep.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <button disabled={!selectVal} onClick={() => submitAnswer(selectVal)}
                  className="w-10 h-10 rounded-xl bg-[#5b5ef4] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#4a4de0] transition-colors shadow-md shadow-[#5b5ef4]/25">
                  <SendIcon/>
                </button>
              </div>
            )}

            {/* File upload */}
            {activeStep?.type === 'file' && (
              <>
                <input type="file" ref={fileRef} accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                  onChange={e => { if(e.target.files?.[0]) { submitAnswer(e.target.files[0].name); e.target.value=''; } }}/>
                <button onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-[#c0c0e8] rounded-xl px-4 py-3.5 text-[13px] text-[#7070a0] hover:border-[#5b5ef4] hover:text-[#5b5ef4] transition-colors text-center font-medium">
                  📎 Click to upload file (PDF, JPG, PNG)
                </button>
                {activeStep.optional && (
                  <button onClick={() => submitAnswer('skipped')}
                    className="w-full text-[12px] text-[#9090b0] hover:text-[#5b5ef4] transition-colors">
                    Skip this step
                  </button>
                )}
              </>
            )}

            {/* Text input (default) */}
            {activeStep?.type === 'text' && (
              <div className="flex flex-col gap-2">
                {/* Voice listening indicator */}
                {voiceMode && isListening && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    <span className="text-[12px] text-red-600 font-medium">Listening… speak your answer</span>
                    <button onClick={stopListening} className="ml-auto text-[11px] text-red-400 hover:text-red-600 font-medium">Stop</button>
                  </div>
                )}
                {/* Speaking indicator */}
                {voiceMode && isSpeaking && !isListening && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-100 rounded-xl">
                    <span className="flex gap-0.5 items-end h-4">
                      {[0,1,2].map(i => (
                        <span key={i} className="w-1 bg-[#5b5ef4] rounded-full animate-bounce" style={{ height:`${8+i*4}px`, animationDelay:`${i*0.15}s` }}/>
                      ))}
                    </span>
                    <span className="text-[12px] text-[#5b5ef4] font-medium">Reading question aloud…</span>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-[#f7f7ff] border border-[#e8e8f4] rounded-xl px-3 py-2">
                  <button className="text-[#9090b0] hover:text-[#5b5ef4] transition-colors p-1"><AttachIcon/></button>
                  <input className="flex-1 bg-transparent text-[13.5px] text-[#1a1a2e] placeholder-[#b0b0c8] focus:outline-none"
                    placeholder={voiceMode ? (isListening ? 'Listening…' : 'Voice answer will appear here — edit if needed') : (activeStep.optional ? 'Type your answer… (or leave blank to skip)' : 'Type your answer…')}
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        if (inputVal.trim()) submitAnswer(inputVal.trim());
                        else if (activeStep.optional) submitAnswer('');
                      }
                    }}/>
                  {/* Mic button — active in all modes but especially useful in voice mode */}
                  <button
                    onClick={() => isListening ? stopListening() : startListening()}
                    title={isListening ? 'Stop recording' : 'Start voice input'}
                    className={`p-1 rounded-lg transition-all ${
                      isListening
                        ? 'text-red-500 bg-red-50 animate-pulse'
                        : 'text-[#9090b0] hover:text-[#5b5ef4] hover:bg-[#f0f0ff]'
                    }`}
                  >
                    <MicIcon/>
                  </button>
                  <button
                    disabled={!inputVal.trim() && !activeStep.optional}
                    onClick={() => { if (inputVal.trim()) submitAnswer(inputVal.trim()); else if (activeStep.optional) submitAnswer(''); }}
                    className="w-8 h-8 rounded-lg bg-[#5b5ef4] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#4a4de0] transition-colors shadow-sm">
                    <SendIcon/>
                  </button>
                </div>
              </div>
            )}

            {/* All done */}
            {stepIdx >= steps.length && !typing && (
              <button onClick={onComplete}
                className="w-full py-3 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold text-[14px] transition-colors shadow-md shadow-green-500/25">
                ✓ Submit Application
              </button>
            )}
          </div>

          {/* Security note */}
          <div className="flex items-center justify-center gap-1.5 py-2 text-[11px] text-[#b0b0c8] border-t border-[#f0f0f8]">
            <LockIcon/> Your information is saved securely and encrypted.
          </div>
        </section>

        {/* ══ RIGHT: Help Assistant ══ */}
        <aside className="bg-white rounded-2xl shadow-sm border border-[#e8e8f0] flex flex-col overflow-hidden">
          <div className="p-5 pb-0">
            <h2 className="text-[15px] font-semibold text-[#1a1a2e] mb-1">Majblomman Assistant</h2>
          </div>

          {helpConv.length === 0 ? (
            <div className="flex flex-col items-center text-center px-5 pt-4 pb-2">
              <BotAvatar/>
              <p className="text-[13px] text-[#6b7280] leading-snug">
                I'm here to help! Ask me anything about the application process.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              <AnimatePresence initial={false}>
                {helpConv.map(msg => (
                  <motion.div key={msg.id}
                    initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:0.2}}
                    className={`flex items-end gap-1.5 ${msg.from==='user'?'flex-row-reverse':''}`}
                  >
                    {msg.from==='ai' ? <BotBubbleIcon/> : <UserAvatar/>}
                    <div className={`max-w-[80%] px-3 py-2 rounded-xl text-[12.5px] leading-relaxed shadow-sm ${
                      msg.from==='ai'
                        ? 'bg-[#f7f7ff] text-[#1a1a2e] border border-[#ededff] rounded-bl-sm'
                        : 'bg-[#5b5ef4] text-white rounded-br-sm'
                    }`}>{msg.text}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={helpEndRef}/>
            </div>
          )}

          {/* Quick question pills */}
          <div className="px-3 pb-2 space-y-1.5 mt-auto">
            {quickQs.map((q, i) => (
              <button key={i} onClick={() => submitHelp(q)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-[#e8e8f4] bg-[#fafafe] hover:border-[#5b5ef4] hover:bg-[#f0f0ff] transition-all text-[12.5px] text-[#3a3a5c] font-medium">
                <span>{q}</span><ChevronRight/>
              </button>
            ))}
          </div>

          {/* Help input */}
          <div className="p-3 border-t border-[#f0f0f8]">
            <div className="flex items-center gap-2 bg-[#f7f7ff] border border-[#e8e8f4] rounded-xl px-3 py-2">
              <input className="flex-1 bg-transparent text-[12.5px] text-[#1a1a2e] placeholder-[#b0b0c8] focus:outline-none"
                placeholder="Ask a question…"
                value={helpInput}
                onChange={e => setHelpInput(e.target.value)}
                onKeyDown={e => e.key==='Enter' && submitHelp()}/>
              <button disabled={!helpInput.trim()} onClick={() => submitHelp()}
                className="w-7 h-7 rounded-lg bg-[#5b5ef4] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#4a4de0] transition-colors">
                <SendIcon/>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
