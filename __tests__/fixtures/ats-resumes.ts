import { emptyResumeData, type ResumeData } from "@/lib/career-resume"

// Calibration fixtures shared by the score tests and local UI checks.

export const CALIBRATION_JD = `Job Title: Administration Manager. Oversee plant administration, facility management, vendor management and statutory compliance.
Requirements: labour law compliance, vendor management, budgeting, OPEX cost control, security and transport management, government liaison with EOBI and PESSI, MS Office and SAP.`

export const role = (title: string, organization: string, startDate: string, endDate: string, bullets: string[]) => ({
  title, organization, location: "Lahore, Pakistan", startDate, endDate, bullets,
})

export const weakResume: ResumeData = {
  ...emptyResumeData,
  fullName: "Ali Raza",
  email: "ali.raza.test@example.com",
  phone: "+92 300 0000000",
  headline: "Operations Manager",
  summary: "I am a hard working team player responsible for operations and admin work at different companies. Results driven professional.",
  skills: ["MS Office", "Vendor Management", "Communication", "Leadership", "SAP"],
  experience: [
    role("Operations Manager", "Sample Foods", "Jan 2021", "Present", ["Responsible for vendor management", "Worked on budget of the plant", "Helped with security and transport", "Managed canteen staff"]),
    role("Admin Officer", "Demo Textiles", "2017", "2020", ["Handled petty cash", "Coordinated with EOBI and PESSI for registrations"]),
  ],
  education: [role("MBA", "University of Lahore", "", "2016", [])],
}

export const strongResume: ResumeData = {
  ...emptyResumeData,
  fullName: "Ali Raza",
  email: "ali.raza.test@example.com",
  phone: "+92 300 0000000",
  location: "Lahore, Pakistan",
  linkedinUrl: "linkedin.com/in/aliraza-test",
  headline: "Administration Manager | Plant Administration, Compliance & Vendor Management",
  summary: "Administration manager with 9 years in food and textile plants, running facility management, vendor management and statutory compliance for up to 1,200 staff. Cut admin OPEX 14% in 2 years through budgeting and vendor renegotiation, and kept EOBI and PESSI inspections at zero findings. Targeting plant administration leadership.",
  skills: ["Plant Administration", "Facility Management", "Vendor Management", "Budgeting", "OPEX Cost Control", "Labour Law Compliance", "EOBI", "PESSI", "Security Management", "Transport Management", "MS Office", "SAP"],
  experience: [
    role("Administration Manager", "Sample Foods", "Jan 2021", "Present", [
      "Directed plant administration for a 1,200 staff site, covering facility management, security, canteen and transport",
      "Reduced admin OPEX by 14% in 2 years through budgeting discipline and vendor management renegotiations across 18 contracts",
      "Secured zero findings in 6 EOBI and PESSI inspections by building a labour law compliance calendar",
      "Rerouted transport management for 3 shifts, saving PKR 2.4 million a year in fuel",
      "Implemented SAP purchase approvals for admin spend, cutting approval time from 5 days to 2",
    ]),
    role("Admin Officer", "Demo Textiles", "Mar 2017", "Dec 2020", [
      "Controlled petty cash of PKR 300,000 a month with monthly reconciliations and no audit exceptions",
      "Registered 450 workers with EOBI and PESSI, clearing a 2 year registration backlog",
      "Negotiated security management contracts for 2 plants, lowering guard costs by 9%",
    ]),
  ],
  education: [role("MBA", "University of Lahore", "Sep 2014", "Jun 2016", [])],
  certifications: ["Certified Facility Manager"],
}

