// The parts of the JSON Resume schema (v1.0.0) that the template renders.

export interface Location {
  address?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  countryCode?: string;
}

export interface Profile {
  network: string;
  username: string;
  url: string;
}

export interface Basics {
  name: string;
  label: string;
  image?: string;
  email?: string;
  phone?: string;
  url?: string;
  summary?: string;
  location?: Location;
  profiles?: Profile[];
}

interface Dated {
  startDate?: string;
  endDate?: string;
}

export interface Work extends Dated {
  /** Absent for periods without an employer, such as a career break. */
  name?: string;
  position: string;
  url?: string;
  /** What the company does, e.g. "Fintech". */
  description?: string;
  location?: string;
  summary?: string;
  highlights?: string[];
  /** How many highlights, from the top, the PDF shows; the website always shows all. Not part of JSON Resume. */
  pdfHighlights?: number;
}

export interface Volunteer extends Dated {
  organization: string;
  position: string;
  url?: string;
  summary?: string;
  highlights?: string[];
}

export interface Education extends Dated {
  institution: string;
  studyType: string;
  area?: string;
  url?: string;
  score?: string;
  courses?: string[];
  /** Shown on the website, left out of the PDF. Not part of JSON Resume. */
  webOnly?: boolean;
}

export interface Skill {
  name: string;
  level?: string;
  keywords?: string[];
}

export interface Language {
  language: string;
  fluency: string;
}

export interface Interest {
  name: string;
  keywords?: string[];
}

export interface Reference {
  name: string;
  reference: string;
}

export interface Resume {
  basics: Basics;
  work?: Work[];
  volunteer?: Volunteer[];
  education?: Education[];
  skills?: Skill[];
  languages?: Language[];
  interests?: Interest[];
  references?: Reference[];
}

export interface Site {
  css?: string;
  siteUrl?: string;
}
