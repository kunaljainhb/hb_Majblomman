import { useState } from "react";
import { motion } from "motion/react";
import { CheckCircle, Copy, Check, User } from "lucide-react";
import { ChatFlow } from "./components/ChatFlow";

export interface Child {
  firstName: string;
  lastName: string;
  idType: 'personal_number' | 'coordination_number' | 'lma_number' | 'other' | '';
  idNumber: string;
}

export interface SupportRequest {
  childIndex: number;
  type: string;
  description: string;
  benefit: string;
}

export interface IncomeSource {
  received: boolean | null;
  amount: number;
}

export interface FormData {
  eligibility: {
    under18: boolean | null;
    hasIncomeInfo: boolean | null;
    knowsSupportReason: boolean | null;
    hasCertificateWriter: boolean | null;
    hasProtectedIdentity: boolean | null;
  };
  previousSupport: {
    received: boolean | null;
  };
  certificate: {
    method: 'upload' | 'manual' | '';
    uploadedFiles: string[];
    writer: {
      firstName: string;
      lastName: string;
      role: string;
      email: string;
      phone: string;
    };
  };
  children: Child[];
  guardians: {
    guardian1: {
      firstName: string;
      lastName: string;
    };
    guardian2: {
      firstName: string;
      lastName: string;
    };
    hasGuardian2: boolean;
  };
  address: {
    householdChildrenCount: number | null;
    street: string;
    postalCode: string;
    city: string;
    apartmentNumber: string;
    coAddress: string;
  };
  contact: {
    email: string;
    confirmEmail: string;
    phone: string;
  };
  bankDetails: {
    hasBankDetails: boolean | null;
    bankName: string;
    accountHolder: string;
    clearingNumber: string;
    accountNumber: string;
  };
  income: {
    childAllowance: IncomeSource;
    parentalBenefit: IncomeSource;
    studyAllowance: IncomeSource;
    maintenanceSupport: IncomeSource;
    careAllowance: IncomeSource;
    unemploymentBenefit: IncomeSource;
    housingAllowance: IncomeSource;
    sicknessBenefit: IncomeSource;
    incomeSupport: IncomeSource;
    salary: IncomeSource;
    otherIncome: IncomeSource;
  };
  familySituation: string;
  supportRequests: SupportRequest[];
  consent: {
    processData: boolean;
    correctInformation: boolean;
  };
}

const initialData: FormData = {
  eligibility: {
    under18: null,
    hasIncomeInfo: null,
    knowsSupportReason: null,
    hasCertificateWriter: null,
    hasProtectedIdentity: null,
  },
  previousSupport: {
    received: null,
  },
  certificate: {
    method: "",
    uploadedFiles: [],
    writer: {
      firstName: "",
      lastName: "",
      role: "",
      email: "",
      phone: "",
    },
  },
  children: [],
  guardians: {
    guardian1: {
      firstName: "",
      lastName: "",
    },
    guardian2: {
      firstName: "",
      lastName: "",
    },
    hasGuardian2: false,
  },
  address: {
    householdChildrenCount: null,
    street: "",
    postalCode: "",
    city: "",
    apartmentNumber: "",
    coAddress: "",
  },
  contact: {
    email: "",
    confirmEmail: "",
    phone: "",
  },
  bankDetails: {
    hasBankDetails: null,
    bankName: "",
    accountHolder: "",
    clearingNumber: "",
    accountNumber: "",
  },
  income: {
    childAllowance: { received: null, amount: 0 },
    parentalBenefit: { received: null, amount: 0 },
    studyAllowance: { received: null, amount: 0 },
    maintenanceSupport: { received: null, amount: 0 },
    careAllowance: { received: null, amount: 0 },
    unemploymentBenefit: { received: null, amount: 0 },
    housingAllowance: { received: null, amount: 0 },
    sicknessBenefit: { received: null, amount: 0 },
    incomeSupport: { received: null, amount: 0 },
    salary: { received: null, amount: 0 },
    otherIncome: { received: null, amount: 0 },
  },
  familySituation: "",
  supportRequests: [],
  consent: {
    processData: false,
    correctInformation: false,
  },
};

function FlowerLogo({ white }: { white?: boolean }) {
  if (white) {
    return (
      <svg width="32" height="32" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <ellipse cx="18" cy="7" rx="4" ry="6.5" fill="#FFFFFF" opacity="0.95" />
        <ellipse cx="18" cy="29" rx="4" ry="6.5" fill="#FFFFFF" opacity="0.95" />
        <ellipse cx="7" cy="18" rx="6.5" ry="4" fill="#FFFFFF" opacity="0.95" />
        <ellipse cx="29" cy="18" rx="6.5" ry="4" fill="#FFFFFF" opacity="0.95" />
        <ellipse cx="10" cy="10" rx="3.5" ry="5.5" fill="#FFFFFF" opacity="0.8" transform="rotate(-45 10 10)" />
        <ellipse cx="26" cy="26" rx="3.5" ry="5.5" fill="#FFFFFF" opacity="0.8" transform="rotate(-45 26 26)" />
        <ellipse cx="26" cy="10" rx="3.5" ry="5.5" fill="#FFFFFF" opacity="0.8" transform="rotate(45 26 10)" />
        <ellipse cx="10" cy="26" rx="3.5" ry="5.5" fill="#FFFFFF" opacity="0.8" transform="rotate(45 10 26)" />
        <circle cx="18" cy="18" r="7" fill="#164E41" />
        <circle cx="18" cy="18" r="3.5" fill="#FFFFFF" />
      </svg>
    );
  }
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <ellipse cx="18" cy="7" rx="4" ry="6.5" fill="#F5C842" opacity="0.9" />
      <ellipse cx="18" cy="29" rx="4" ry="6.5" fill="#F5C842" opacity="0.9" />
      <ellipse cx="7" cy="18" rx="6.5" ry="4" fill="#F5C842" opacity="0.9" />
      <ellipse cx="29" cy="18" rx="6.5" ry="4" fill="#F5C842" opacity="0.9" />
      <ellipse cx="10" cy="10" rx="3.5" ry="5.5" fill="#F5C842" opacity="0.75" transform="rotate(-45 10 10)" />
      <ellipse cx="26" cy="26" rx="3.5" ry="5.5" fill="#F5C842" opacity="0.75" transform="rotate(-45 26 26)" />
      <ellipse cx="26" cy="10" rx="3.5" ry="5.5" fill="#F5C842" opacity="0.75" transform="rotate(45 26 10)" />
      <ellipse cx="10" cy="26" rx="3.5" ry="5.5" fill="#F5C842" opacity="0.75" transform="rotate(45 10 26)" />
      <circle cx="18" cy="18" r="7" fill="#2B5EA7" />
      <circle cx="18" cy="18" r="3.5" fill="#F5C842" />
    </svg>
  );
}

function BackgroundFlower({ className }: { className?: string }) {
  return (
    <svg className={className} width="350" height="350" viewBox="0 0 100 100" fill="none" opacity="0.12" style={{ pointerEvents: 'none' }}>
      <ellipse cx="50" cy="20" rx="12" ry="18" fill="#A78BFA" />
      <ellipse cx="50" cy="80" rx="12" ry="18" fill="#A78BFA" />
      <ellipse cx="20" cy="50" rx="18" ry="12" fill="#A78BFA" />
      <ellipse cx="80" cy="50" rx="18" ry="12" fill="#A78BFA" />
      
      <g transform="rotate(45 50 50)">
        <ellipse cx="50" cy="20" rx="12" ry="18" fill="#A78BFA" />
        <ellipse cx="50" cy="80" rx="12" ry="18" fill="#A78BFA" />
        <ellipse cx="20" cy="50" rx="18" ry="12" fill="#A78BFA" />
        <ellipse cx="80" cy="50" rx="18" ry="12" fill="#A78BFA" />
      </g>
      <circle cx="50" cy="50" r="15" fill="#A78BFA" />
    </svg>
  );
}

import { Button } from "./components/ui/button";

function SuccessScreen({ onReset, language }: { onReset: () => void; formData: FormData; language: 'en' | 'sv' }) {

  const content = {
    en: {
      submitted: "Application Submitted!",
      desc: "Thank you for applying. Your application has been securely submitted to Majblomman. Our caseworker team will review it and follow up within 5–7 business days.",
      charityInfo: "Majblomman · Supporting children since 1907",
      resetBtn: "Start new application",
    },
    sv: {
      submitted: "Ansökan inskickad!",
      desc: "Tack för din ansökan. Din ansökan har skickats till Majblomman. Vårt handläggarteam kommer att granska den och återkomma inom 5–7 arbetsdagar.",
      charityInfo: "Majblomman · Stödjer barn sedan 1907",
      resetBtn: "Starta en ny ansökan",
    }
  }[language];

  return (
    <div className="min-h-screen bg-[#ededff] flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-lg w-full bg-white rounded-3xl border border-slate-100 shadow-xl p-10 flex flex-col items-center text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
          className="w-20 h-20 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 mb-6"
        >
          <CheckCircle className="w-10 h-10" />
        </motion.div>

        <h1
          className="text-slate-800 mb-3"
          style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: "2rem", fontWeight: 500 }}
        >
          {content.submitted}
        </h1>
        <p className="text-slate-500 leading-relaxed mb-8 text-sm max-w-sm">
          {content.desc}
        </p>

        <div className="inline-flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-full px-4 py-2 border border-slate-100 mb-8">
          <FlowerLogo />
          <span>{content.charityInfo}</span>
        </div>

        <Button
          onClick={onReset}
          variant="outline"
          className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 px-8"
        >
          {content.resetBtn}
        </Button>
      </motion.div>
    </div>
  );
}

function EligibilityScreen({ onContinue }: { onContinue: () => void }) {
  const [agreed, setAgreed] = useState(false);
  const [showError, setShowError] = useState(false);
  return (
    <>
      <div className="max-w-3xl mx-auto w-full px-4 pt-8 pb-12 flex flex-col gap-6">
      <h2 className="text-center text-[#164E41] font-bold text-2xl mb-2" style={{ fontFamily: "Fraunces, Georgia, serif" }}>
        Before applying for financial support for children
      </h2>

      <div className="bg-white rounded-xl shadow-sm border border-[#e8e8f0] p-8">
        <h3 className="font-bold text-[#164E41] text-[15px] mb-2">Requirements to apply for financial support from Majblomman</h3>
        <p className="text-sm font-bold text-[#1a1a2e] mb-4">All requirements must be met for the application to be approved</p>
        <ul className="list-disc pl-5 text-sm text-[#4a4a5e] space-y-2 mb-6">
          <li>The children I am applying for are 18 years old or younger</li>
          <li>I have information about the family's combined income</li>
          <li>I know what I want to apply for support for and can describe why the children need the support</li>
          <li>I have contacted a person who can write a certificate to confirm the child's need</li>
          <li>We do <strong>not</strong> have protected identity</li>
        </ul>
        <label className="flex items-start gap-3 cursor-pointer mt-4">
          <input 
            type="checkbox" 
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#164E41] focus:ring-[#164E41]"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <span className="text-sm text-[#1a1a2e] font-medium">I meet all the requirements to apply for financial support from Majblomman</span>
        </label>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#e8e8f0] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-[#1a1a2e] text-sm mb-1">Application in progress</h3>
          <p className="text-sm text-[#6b7280]">
            Have you already started an application?{' '}
            <a href="#" className="text-[#164E41] underline font-medium hover:text-[#0f342c]">continue here</a>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#e8e8f0] p-6">
        <h3 className="font-bold text-[#1a1a2e] text-sm mb-1">Protected identity</h3>
        <p className="text-sm text-[#6b7280]">
          If you have a protected identity, use <a href="#" className="text-blue-600 underline hover:text-blue-800">this form</a>.
        </p>
      </div>

      <div className="flex justify-center mt-6">
        <button
          onClick={() => {
            if (!agreed) setShowError(true);
            else onContinue();
          }}
          className="px-10 py-3 rounded-full text-sm font-semibold transition-all bg-[#849a90] hover:bg-[#72887e] text-white shadow-md"
        >
          Next
        </button>
      </div>
    </div>

    {showError && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 flex flex-col items-start gap-4">
          <h2 className="text-[#164E41] font-bold text-xl mb-1">You must fill in or change:</h2>
          <ul className="list-disc pl-5 text-[#4a4a5e] text-[15px] space-y-2 mb-4">
            <li>You must tick the box confirming that you meet all the requirements to apply for financial support.</li>
          </ul>
          <button
            onClick={() => setShowError(false)}
            className="ml-auto px-6 py-2 rounded-lg bg-[#2a685b] hover:bg-[#164E41] text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    )}
    </>
  );
}

export default function App() {
  /* MARKER-MAKE-KIT-INVOKED */
  const [formData, setFormData] = useState<FormData>(initialData);
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [language, setLanguage] = useState<string>('en');

  const handleReset = () => {
    // Clear all persisted application data so the new user starts fresh
    localStorage.removeItem('mjb_v2');
    localStorage.removeItem('mjb_progress');
    localStorage.removeItem('majblomman_progress');
    setFormData(initialData);
    setStarted(false);
    setSubmitted(false);
    setResetKey(prev => prev + 1);
    // Scroll back to the top of the page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateData = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div className="min-h-screen bg-[#ededff] flex flex-col font-sans relative overflow-hidden">
      {/* Background Decorative Flowers (Overlapping Left and Right sides) */}
      <BackgroundFlower className="absolute bottom-10 left-[-100px] text-violet-300 md:w-[450px] md:h-[450px] transform rotate-[15deg]" />
      <BackgroundFlower className="absolute top-[20%] right-[-100px] text-violet-300 md:w-[450px] md:h-[450px] transform rotate-[-25deg]" />

      {/* Header */}
      <header className="bg-[#164E41] sticky top-0 z-40 shadow-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FlowerLogo white />
            <p
              className="text-white text-lg tracking-wider"
              style={{ fontFamily: "Fraunces, Georgia, serif", fontWeight: 500 }}
            >
              Majblomman
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-[#103b31] border border-[#2a685b] text-white text-xs rounded-lg px-4 py-1.5 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white transition-all cursor-pointer font-medium appearance-none pr-8 relative"
              style={{
                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center',
                backgroundSize: '12px'
              }}
            >
              <option value="en">English</option>
              <option value="ar">Arabic</option>
              <option value="uk">Ukrainian</option>
              <option value="fa">Persian (Farsi)</option>
              <option value="fa-AF">Dari</option>
              <option value="so">Somali</option>
              <option value="tr">Turkish</option>
              <option value="ti">Tigrinya</option>
              <option value="ru">Russian</option>
              <option value="pl">Polish</option>
              <option value="sr">Serbian</option>
              <option value="hr">Croatian</option>
              <option value="sq">Albanian</option>
              <option value="ps">Pashto</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="sv">Swedish</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-[1280px] mx-auto w-full pt-5 pb-0 z-10 px-4 text-center">
        <h1
          className="text-[#1a1a2e] text-[1.35rem] font-semibold tracking-tight"
          style={{ fontFamily: "Fraunces, Georgia, serif" }}
        >
          Application for financial support for children
        </h1>
      </div>

      <main className="flex-1 flex flex-col pt-3 z-10">
        {submitted ? (
          <SuccessScreen onReset={handleReset} formData={formData} language={language as 'en' | 'sv'} />
        ) : !started ? (
          <EligibilityScreen onContinue={() => setStarted(true)} />
        ) : (
          <ChatFlow 
            key={`${resetKey}-${language}`}
            formData={formData} 
            updateData={updateData} 
            onComplete={() => setSubmitted(true)}
            language={language as 'en' | 'sv'}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="z-10 py-3 text-center text-[12.5px] text-[#6b7280]">
        {started && !submitted && (
          <div className="mb-6 mt-4">
            <button
              onClick={() => setStarted(false)}
              className="px-6 py-2.5 rounded-full bg-white border border-[#d0d0e8] text-[13px] font-semibold text-[#3a3a5c] hover:bg-[#f0f0ff] hover:border-[#5b5ef4] hover:text-[#5b5ef4] transition-all shadow-sm flex items-center gap-2 mx-auto"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Go Back
            </button>
          </div>
        )}
        Read more about requirements for financial support at{' '}
        <a
          href="https://majblomman.se/sok-stod/sok-har/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#5b5ef4] hover:underline font-medium"
        >
          Majblomman.se
        </a>
      </footer>
    </div>
  );
}
