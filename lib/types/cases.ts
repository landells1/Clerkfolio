export type Case = {
  id: string
  user_id: string
  title: string
  date: string
  clinical_domain: string | null
  clinical_domains: string[]
  specialty_tags: string[]
  notes: string | null
  pinned: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
  interview_themes?: string[]
}

export type NewCase = Omit<Case, 'id' | 'user_id' | 'created_at' | 'updated_at'>

// Common clinical domains — shown as suggestions, free text is also accepted
export const CLINICAL_DOMAINS = [
  'Acute Medicine',
  'Anaesthetics',
  'Cardiology',
  'Clinical Haematology',
  'Critical Care / ITU',
  'Dermatology',
  'Emergency Medicine',
  'Endocrinology & Diabetes',
  'Gastroenterology',
  'General Medicine',
  'General Surgery',
  'Geriatric Medicine',
  'Infectious Diseases',
  'Nephrology',
  'Neurology',
  'Neurosurgery',
  'Obstetrics & Gynaecology',
  'Oncology',
  'Ophthalmology',
  'Orthopaedics',
  'Paediatrics',
  'Palliative Care',
  'Psychiatry',
  'Radiology',
  'Respiratory Medicine',
  'Rheumatology',
  'Urology',
  'Vascular Surgery',
] as const
