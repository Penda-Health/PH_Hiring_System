import { Candidate } from "@/types";

const ref = (name: string, email: string, phone: string) => ({ name, email, phone });

export const candidates: Candidate[] = [
  // First Interview
  { id: "cand-1", candId: "CAND-001", name: "Wanjiru Kamau", phone: "+254712345601", email: "wanjiru.kamau@gmail.com", roleId: "role-1", stage: "First Interview", source: "SeamlessHR", gender: "Female", employmentType: "Full-time", stageEnteredAt: "2026-06-15", createdAt: "2026-06-10" },
  { id: "cand-2", candId: "CAND-002", name: "Otieno Odhiambo", phone: "+254712345602", email: "otieno.odhiambo@gmail.com", roleId: "role-2", stage: "First Interview", source: "Referral", gender: "Male", employmentType: "Full-time", stageEnteredAt: "2026-06-16", createdAt: "2026-06-11" },
  { id: "cand-3", candId: "CAND-003", name: "Amina Hassan", phone: "+254712345603", email: "amina.hassan@gmail.com", roleId: "role-4", stage: "First Interview", source: "SeamlessHR", gender: "Female", employmentType: "Full-time", stageEnteredAt: "2026-06-17", createdAt: "2026-06-12" },
  { id: "cand-4", candId: "CAND-004", name: "Brian Mwangi", phone: "+254712345604", email: "brian.mwangi@gmail.com", roleId: "role-8", stage: "First Interview", source: "LinkedIn", gender: "Male", employmentType: "Full-time", stageEnteredAt: "2026-06-18", createdAt: "2026-06-13" },
  { id: "cand-5", candId: "CAND-005", name: "Faith Chebet", phone: "+254712345605", email: "faith.chebet@gmail.com", roleId: "role-5", stage: "First Interview", source: "SeamlessHR", gender: "Female", employmentType: "Full-time", stageEnteredAt: "2026-06-18", createdAt: "2026-06-14" },
  { id: "cand-6", candId: "CAND-006", name: "Kevin Onyango", phone: "+254712345606", email: "kevin.onyango@gmail.com", roleId: "role-9", stage: "First Interview", source: "Referral", gender: "Male", employmentType: "Full-time", stageEnteredAt: "2026-06-19", createdAt: "2026-06-14" },

  // Second Interview
  { id: "cand-7", candId: "CAND-007", name: "Grace Njoroge", phone: "+254712345607", email: "grace.njoroge@gmail.com", roleId: "role-1", stage: "Second Interview", source: "SeamlessHR", gender: "Female", employmentType: "Full-time", stageEnteredAt: "2026-06-12", createdAt: "2026-06-01" },
  { id: "cand-8", candId: "CAND-008", name: "Samuel Kariuki", phone: "+254712345608", email: "samuel.kariuki@gmail.com", roleId: "role-6", stage: "Second Interview", source: "SeamlessHR", gender: "Male", employmentType: "Full-time", stageEnteredAt: "2026-06-13", createdAt: "2026-06-02" },
  { id: "cand-9", candId: "CAND-009", name: "Mercy Adhiambo", phone: "+254712345609", email: "mercy.adhiambo@gmail.com", roleId: "role-3", stage: "Second Interview", source: "Referral", gender: "Female", employmentType: "Full-time", stageEnteredAt: "2026-06-14", createdAt: "2026-06-03" },

  // Panel Interview
  { id: "cand-10", candId: "CAND-010", name: "Joseph Mutua", phone: "+254712345610", email: "joseph.mutua@gmail.com", roleId: "role-10", stage: "Panel Interview", source: "LinkedIn", gender: "Male", employmentType: "Full-time", stageEnteredAt: "2026-06-10", createdAt: "2026-05-28" },
  { id: "cand-11", candId: "CAND-011", name: "Esther Wambui", phone: "+254712345611", email: "esther.wambui@gmail.com", roleId: "role-6", stage: "Panel Interview", source: "SeamlessHR", gender: "Female", employmentType: "Full-time", stageEnteredAt: "2026-06-11", createdAt: "2026-05-30" },

  // Work Trial
  { id: "cand-12", candId: "CAND-012", name: "David Korir", phone: "+254712345612", email: "david.korir@gmail.com", roleId: "role-1", stage: "Work Trial", source: "SeamlessHR", gender: "Male", employmentType: "Full-time", workTrialStatus: "Awaiting Arrival", stageEnteredAt: "2026-06-19", createdAt: "2026-05-20" },
  { id: "cand-13", candId: "CAND-013", name: "Lucy Nyambura", phone: "+254712345613", email: "lucy.nyambura@gmail.com", roleId: "role-6", stage: "Work Trial", source: "Referral", gender: "Female", employmentType: "Full-time", workTrialStatus: "Awaiting Score", stageEnteredAt: "2026-06-18", createdAt: "2026-05-22" },
  { id: "cand-14", candId: "CAND-014", name: "Peter Omondi", phone: "+254712345614", email: "peter.omondi@gmail.com", roleId: "role-5", stage: "Work Trial", source: "SeamlessHR", gender: "Male", employmentType: "Full-time", workTrialStatus: "Complete", stageEnteredAt: "2026-06-15", createdAt: "2026-05-15" },
  { id: "cand-15", candId: "CAND-015", name: "Sarah Wairimu", phone: "+254712345615", email: "sarah.wairimu@gmail.com", roleId: "role-7", stage: "Work Trial", source: "SeamlessHR", gender: "Female", employmentType: "Full-time", workTrialStatus: "Complete", stageEnteredAt: "2026-06-14", createdAt: "2026-05-12" },

  // Reference Check
  { id: "cand-16", candId: "CAND-016", name: "Felix Kiprotich", phone: "+254712345616", email: "felix.kiprotich@gmail.com", roleId: "role-1", stage: "Reference Check", source: "SeamlessHR", gender: "Male", employmentType: "Full-time", refCheckStatus: "Ref 1 Responded / Ref 2 Pending", stageEnteredAt: "2026-06-16", createdAt: "2026-05-10", referee1: ref("Dr. Omondi Achieng", "omondi.achieng@example.com", "+254722000001"), referee2: ref("Nancy Wairimu", "nancy.wairimu@example.com", "+254722000002") },
  { id: "cand-17", candId: "CAND-017", name: "Naomi Akinyi", phone: "+254712345617", email: "naomi.akinyi@gmail.com", roleId: "role-4", stage: "Reference Check", source: "SeamlessHR", gender: "Female", employmentType: "Full-time", refCheckStatus: "Both Pending", stageEnteredAt: "2026-06-17", createdAt: "2026-05-14", referee1: ref("Dr. Hassan Ali", "hassan.ali@example.com", "+254722000003"), referee2: ref("Beatrice Kanini", "beatrice.kanini@example.com", "+254722000004") },
  { id: "cand-18", candId: "CAND-018", name: "Dennis Mwangi", phone: "+254712345618", email: "dennis.mwangi@gmail.com", roleId: "role-2", stage: "Reference Check", source: "Referral", gender: "Male", employmentType: "Full-time", refCheckStatus: "Complete", stageEnteredAt: "2026-06-08", createdAt: "2026-05-02", referee1: ref("Susan Mbithe", "susan.mbithe@example.com", "+254722000005"), referee2: ref("Tom Kiplangat", "tom.kiplangat@example.com", "+254722000006") },

  // Offer
  { id: "cand-19", candId: "CAND-019", name: "Rose Chepkemoi", phone: "+254712345619", email: "rose.chepkemoi@gmail.com", roleId: "role-6", stage: "Offer", source: "SeamlessHR", gender: "Female", employmentType: "Full-time", offerStatus: "Pending", joined: "Pending", stageEnteredAt: "2026-06-12", createdAt: "2026-04-28" },
  { id: "cand-20", candId: "CAND-020", name: "Victor Otieno", phone: "+254712345620", email: "victor.otieno@gmail.com", roleId: "role-1", stage: "Offer", source: "SeamlessHR", gender: "Male", employmentType: "Full-time", offerStatus: "Negotiating", joined: "Pending", stageEnteredAt: "2026-06-09", createdAt: "2026-04-20" },

  // Hired
  { id: "cand-21", candId: "CAND-021", name: "Irene Muthoni", phone: "+254712345621", email: "irene.muthoni@gmail.com", roleId: "role-10", stage: "Hired", source: "SeamlessHR", gender: "Female", employmentType: "Full-time", offerStatus: "Accepted", joined: "Joined", stageEnteredAt: "2026-05-20", createdAt: "2026-04-01" },
  { id: "cand-22", candId: "CAND-022", name: "Collins Were", phone: "+254712345622", email: "collins.were@gmail.com", roleId: "role-6", stage: "Hired", source: "Referral", gender: "Male", employmentType: "Full-time", offerStatus: "Accepted", joined: "Joined", stageEnteredAt: "2026-05-25", createdAt: "2026-04-05" },

  // Backup Pool
  { id: "cand-23", candId: "CAND-023", name: "Beatrice Wangari", phone: "+254712345623", email: "beatrice.wangari@gmail.com", roleId: "role-1", stage: "Backup Pool", source: "SeamlessHR", gender: "Female", employmentType: "Full-time", stageEnteredAt: "2026-06-05", createdAt: "2026-05-01" },
  { id: "cand-24", candId: "CAND-024", name: "Eric Kamau", phone: "+254712345624", email: "eric.kamau@gmail.com", roleId: "role-6", stage: "Backup Pool", source: "SeamlessHR", gender: "Male", employmentType: "Full-time", stageEnteredAt: "2026-06-06", createdAt: "2026-05-03" },

  // Rejected
  { id: "cand-25", candId: "CAND-025", name: "Linet Atieno", phone: "+254712345625", email: "linet.atieno@gmail.com", roleId: "role-3", stage: "Rejected", source: "SeamlessHR", gender: "Female", employmentType: "Full-time", stageEnteredAt: "2026-06-04", createdAt: "2026-05-25" },
];
