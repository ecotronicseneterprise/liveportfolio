// INVENTED people for the design review page, the landing specimen and the tests. Every name, employer and number here is made up.
// Generated once from design-lab/phase1 and then edited by hand; they are fixtures, not data from any real portfolio.
import type { PortfolioContent } from '@/components/templates/Minimal'

export type SampleKind = 'engineer' | 'finance' | 'clinician' | 'designer'

export const SAMPLE_PEOPLE: Record<SampleKind, PortfolioContent> = {
  "engineer": {
    "name": "Ada Okonkwo",
    "role": "Backend engineer",
    "headline": "I build payment systems that stay up, and I can show you the numbers.",
    "about": "Five years building payment and ledger systems in Go and Postgres, most of it at a Lagos fintech serving two million customers.\n\nI like the unglamorous parts of reliability: idempotency, reconciliation, and the dashboards that tell you a problem exists before a customer does.",
    "location": "Lagos, Nigeria",
    "email": "ada@example.com",
    "github_url": "https://github.com/adaokonkwo",
    "linkedin_url": "https://linkedin.com/in/adaokonkwo",
    "skills": [
      "Go",
      "Python",
      "SQL",
      "Postgres",
      "Redis",
      "Kafka",
      "Kubernetes",
      "Terraform",
      "gRPC"
    ],
    "skills_narrative": "",
    "skills_grouped": [
      {
        "category": "Languages",
        "items": [
          "Go",
          "Python",
          "SQL"
        ]
      },
      {
        "category": "Data",
        "items": [
          "Postgres",
          "Redis",
          "Kafka"
        ]
      },
      {
        "category": "Infrastructure",
        "items": [
          "Kubernetes",
          "Terraform",
          "gRPC"
        ]
      }
    ],
    "projects": [
      {
        "title": "Ledger migration",
        "problem": "The old ledger could not reconcile card and bank transfers without a nightly manual step.",
        "solution": "Moved to an append-only double-entry ledger in Postgres with idempotent writes.",
        "outcome": "Nightly reconciliation went from 3 hours to 9 minutes, with zero manual fixes in 6 months.",
        "stack": []
      },
      {
        "title": "Rate limiter",
        "problem": "Twelve services each rolled their own limits, and one bad client could take down checkout.",
        "solution": "A shared token-bucket limiter with per-tenant budgets, backed by Redis.",
        "outcome": "p95 latency down 40% during traffic spikes; no checkout incidents since launch.",
        "stack": []
      },
      {
        "title": "Invoice parser",
        "problem": "Supplier invoices were keyed in by hand.",
        "solution": "A parser that reads PDFs and posts matched lines to the ledger.",
        "outcome": "Cut data entry from 40 hours a week to 6.",
        "stack": []
      }
    ],
    "experience": [
      {
        "company": "Acme Payments",
        "role": "Senior software engineer",
        "period": "2022 to now",
        "bullets": [
          "Led the ledger migration for a 4-person team.",
          "Cut p95 payment latency by 40% across 12 services.",
          "On-call lead; halved paging incidents in a year."
        ]
      },
      {
        "company": "Kobo Finance",
        "role": "Software engineer",
        "period": "2019 to 2022",
        "bullets": [
          "Built the card-settlement service handling 120,000 transactions a day.",
          "Introduced contract tests that caught 30+ breaking changes before release."
        ]
      }
    ],
    "education": [
      {
        "degree": "B.Eng. Electrical and Electronics Engineering",
        "institution": "University of Lagos",
        "year": "2018",
        "grade": "First class"
      }
    ],
    "certifications": [
      "AWS Certified Solutions Architect",
      "CKA: Certified Kubernetes Administrator"
    ],
    "testimonials": [
      {
        "text": "Ada is the person we call when a number does not add up. She finds out why, and she fixes it for good.",
        "author": "Tunde Bakare",
        "role": "Head of Engineering, Acme Payments"
      }
    ]
  },
  "finance": {
    "name": "Samuel Adeyemi",
    "role": "Financial analyst, ACCA",
    "headline": "I turn a ten-day month-end close into a two-day one.",
    "about": "Seven years in group reporting and FP&A across banking and microfinance, the last three leading consolidation for a 14-branch lender.\n\nMy work is the boring discipline that lets a board trust the numbers: clean reconciliations, one source of truth, and forecasts that are checked against what actually happened.",
    "location": "Abuja, Nigeria",
    "email": "samuel@example.com",
    "linkedin_url": "https://linkedin.com/in/samueladeyemi",
    "skills": [
      "IFRS",
      "Consolidation",
      "Board packs",
      "Budgeting",
      "Forecasting",
      "Cash flow",
      "Excel",
      "Power BI",
      "SQL"
    ],
    "skills_narrative": "",
    "skills_grouped": [
      {
        "category": "Reporting",
        "items": [
          "IFRS",
          "Consolidation",
          "Board packs"
        ]
      },
      {
        "category": "Planning",
        "items": [
          "Budgeting",
          "Forecasting",
          "Cash flow"
        ]
      },
      {
        "category": "Tools",
        "items": [
          "Excel",
          "Power BI",
          "SQL"
        ]
      }
    ],
    "projects": [
      {
        "title": "Group consolidation rebuild",
        "problem": "Fourteen branches reported in fourteen formats, and consolidation took ten working days.",
        "solution": "One chart of accounts, automated intercompany eliminations, and a locked close calendar.",
        "outcome": "Month-end close went from 10 days to 2, with 0 audit adjustments in the last two cycles.",
        "stack": []
      },
      {
        "title": "Working-capital programme",
        "problem": "Receivables were aging past 90 days with no owner.",
        "solution": "Weekly collections review with branch managers and a simple aging dashboard.",
        "outcome": "Released ₦640M of cash and cut 90-day receivables from 18% to 7%.",
        "stack": []
      },
      {
        "title": "Branch budget model",
        "problem": "Budgets were set top-down and missed by 20% or more.",
        "solution": "A driver-based model owned by each branch, reviewed quarterly against actuals.",
        "outcome": "Average forecast error fell from 21% to 6% in four quarters.",
        "stack": []
      }
    ],
    "experience": [
      {
        "company": "Northgate Microfinance",
        "role": "Group reporting lead",
        "period": "2021 to now",
        "bullets": [
          "Own the monthly consolidation for 14 branches.",
          "Present the board pack and answer audit queries.",
          "Trained 9 branch accountants on the new close calendar."
        ]
      },
      {
        "company": "Alder & Finch Capital",
        "role": "Financial analyst",
        "period": "2017 to 2021",
        "bullets": [
          "Built the budget and rolling-forecast models for four business units.",
          "Prepared IFRS 9 expected-credit-loss estimates each quarter."
        ]
      }
    ],
    "education": [
      {
        "degree": "B.Sc. Accounting",
        "institution": "University of Ilorin",
        "year": "2016",
        "grade": "Second class upper"
      }
    ],
    "certifications": [
      "ACCA, Fellow",
      "ICAN, Associate"
    ],
    "testimonials": [
      {
        "text": "Samuel gave us our first close we trusted. The auditors noticed before we told them.",
        "author": "Hauwa Musa",
        "role": "CFO, Northgate Microfinance"
      }
    ]
  },
  "clinician": {
    "name": "Dr. Ifeoma Eze",
    "role": "Physiotherapist, sports and orthopaedic rehabilitation",
    "headline": "I get people back to their sport, and keep them there.",
    "about": "Eight years treating athletes and office workers with knee, shoulder and back problems, first in a teaching hospital and now in my own sports clinic.\n\nI plan every programme around what the person needs to do again, whether that is a marathon or lifting a toddler, and I measure progress at every visit so we both know it is working.",
    "location": "Lagos, Nigeria",
    "email": "ifeoma@example.com",
    "linkedin_url": "https://linkedin.com/in/ifeomaeze",
    "skills": [
      "Knee and ACL",
      "Shoulder",
      "Lower back",
      "Manual therapy",
      "Dry needling",
      "Strength testing",
      "English",
      "Igbo",
      "Yoruba"
    ],
    "skills_narrative": "",
    "skills_grouped": [
      {
        "category": "Clinical focus",
        "items": [
          "Knee and ACL",
          "Shoulder",
          "Lower back"
        ]
      },
      {
        "category": "Methods",
        "items": [
          "Manual therapy",
          "Dry needling",
          "Strength testing"
        ]
      },
      {
        "category": "Languages",
        "items": [
          "English",
          "Igbo",
          "Yoruba"
        ]
      }
    ],
    "projects": [
      {
        "title": "Post-operative ACL rehabilitation programme",
        "problem": "Athletes were returning to sport on a calendar date, not on readiness, and re-injury was common.",
        "solution": "A criteria-based programme with strength and hop tests at each stage before clearance.",
        "outcome": "Re-injury within a year fell from 14% to 4% across 60 athletes.",
        "stack": []
      },
      {
        "title": "Back-pain group clinic",
        "problem": "Office workers waited six weeks for a one-to-one slot.",
        "solution": "A small-group clinic combining education, graded exercise and desk-setup advice.",
        "outcome": "82% of 140 attendees reported pain reduced by half or more within 8 weeks.",
        "stack": []
      },
      {
        "title": "Marathon medical cover",
        "problem": "Runners with cramps and sprains had no pitch-side physiotherapy.",
        "solution": "Staffed four treatment points and a recovery tent for the Lagos marathon.",
        "outcome": "Treated 310 runners on the day; 9 in 10 finished the course.",
        "stack": []
      }
    ],
    "experience": [
      {
        "company": "Eze Sports & Spine Clinic",
        "role": "Founder and lead physiotherapist",
        "period": "2021 to now",
        "bullets": [
          "See about 25 patients a week and supervise two assistants.",
          "Run the ACL pathway for three local football clubs."
        ]
      },
      {
        "company": "Teaching Hospital, Lagos",
        "role": "Physiotherapist, orthopaedics",
        "period": "2016 to 2021",
        "bullets": [
          "Treated post-operative hip, knee and shoulder patients.",
          "Taught final-year physiotherapy students on placement."
        ]
      }
    ],
    "education": [
      {
        "degree": "Doctor of Physiotherapy (DPT)",
        "institution": "University of Nigeria, Nsukka",
        "year": "2015"
      }
    ],
    "certifications": [
      "Registered with the Medical Rehabilitation Therapists Board of Nigeria",
      "Manual therapy, Level 2",
      "Dry needling, accredited"
    ],
    "testimonials": [
      {
        "text": "Dr. Eze told me what I could do each week, and she was right every time. I ran again in five months.",
        "author": "Kelechi Obi",
        "role": "Patient, ACL reconstruction"
      }
    ]
  },
  "designer": {
    "name": "Tomi Bello",
    "role": "Product designer",
    "headline": "I design the parts of a product people use every day, until they are boring in the best way.",
    "about": "Six years designing onboarding, payments and settings for consumer apps in Africa and Europe, from first sketch to shipped release.\n\nI work in small teams, write my own specs and measure what I ship. I would rather change one screen that moves a number than redesign ten that move nothing.",
    "location": "Lagos, Nigeria · remote",
    "email": "tomi@example.com",
    "linkedin_url": "https://linkedin.com/in/tomibello",
    "skills": [
      "Interaction design",
      "Prototyping",
      "Design systems",
      "Usability testing",
      "Interviews",
      "Analytics",
      "Figma",
      "Framer",
      "SQL basics"
    ],
    "skills_narrative": "",
    "skills_grouped": [
      {
        "category": "Craft",
        "items": [
          "Interaction design",
          "Prototyping",
          "Design systems"
        ]
      },
      {
        "category": "Research",
        "items": [
          "Usability testing",
          "Interviews",
          "Analytics"
        ]
      },
      {
        "category": "Tools",
        "items": [
          "Figma",
          "Framer",
          "SQL basics"
        ]
      }
    ],
    "projects": [
      {
        "title": "Wallet top-up redesign",
        "problem": "One in three people abandoned top-up at the card step.",
        "solution": "Cut the flow from five screens to two and added saved-card recognition.",
        "outcome": "Top-up completion rose from 61% to 84% in the first month.",
        "stack": []
      },
      {
        "title": "First-run onboarding",
        "problem": "New users did not reach the first transfer, and support tickets piled up.",
        "solution": "Replaced a seven-step tour with one guided first task.",
        "outcome": "Day-7 activation up from 22% to 37%; onboarding tickets down by half.",
        "stack": []
      },
      {
        "title": "Settings and security centre",
        "problem": "Users could not find how to freeze a lost card.",
        "solution": "A single security page with plain-language actions and a one-tap freeze.",
        "outcome": "Freeze time dropped from 4 minutes to 15 seconds; fraud losses fell 18%.",
        "stack": []
      }
    ],
    "experience": [
      {
        "company": "Paywise",
        "role": "Senior product designer",
        "period": "2022 to now",
        "bullets": [
          "Lead designer for payments; two designers report to me.",
          "Built the design system used by 5 product squads."
        ]
      },
      {
        "company": "Studio Nine",
        "role": "Product designer",
        "period": "2018 to 2022",
        "bullets": [
          "Shipped 20+ features for fintech and logistics clients.",
          "Ran usability sessions with 80+ users."
        ]
      }
    ],
    "education": [
      {
        "degree": "B.A. Industrial Design",
        "institution": "Yaba College of Technology",
        "year": "2018"
      }
    ],
    "certifications": [
      "Google UX Design Certificate",
      "NN/g UX Certification"
    ],
    "testimonials": [
      {
        "text": "Tomi made the hardest flow in our app feel obvious. Completion went up and the complaints stopped.",
        "author": "Zainab Lawal",
        "role": "Head of Product, Paywise"
      }
    ]
  }
}

/** The least a portfolio can have: a name and an e-mail. Every optional block must disappear cleanly. */
export const SPARSE: PortfolioContent = {
  name: 'Chidi Eze',
  role: '',
  headline: '',
  about: '',
  location: '',
  email: 'chidi@example.com',
  skills: [],
  skills_narrative: '',
  skills_grouped: [],
  projects: [],
  experience: [],
}

/** A very long name and very long unbroken strings: nothing may overflow or push the layout sideways. */
export const LONG_STRINGS: PortfolioContent = {
  ...SAMPLE_PEOPLE.engineer,
  name: 'Oluwadamilolatemitopeayodele Chukwuemekanwabueze-Adewale',
  role: 'Principal platform reliability and distributed systems engineering lead for payments infrastructure',
  email: 'oluwadamilolatemitopeayodele.chukwuemekanwabueze-adewale@a-very-long-company-domain.example.com',
  projects: [
    { title: 'A migration of the ledger from a nightly batch reconciliation to an append-only double-entry system', problem: 'Reconciliationwithoutanybreaksinthetextatallforaverylongtimeandmore'.repeat(2), solution: 'Short.', outcome: 'Reconciliation went from 3 hours to 9 minutes.', stack: ['Go'] },
  ],
}

/** One project, no figures in the result, no photo: the proof arrangement must still read well. */
export const ONE_PROJECT_NO_FIGURES: PortfolioContent = {
  ...SAMPLE_PEOPLE.designer,
  projects: [{ title: 'Settings and security centre', problem: 'People could not find how to freeze a lost card.', solution: 'A single security page with plain-language actions.', outcome: 'Fewer support tickets about lost cards.', stack: [] }],
}
