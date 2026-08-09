import { Reliever, Locum } from "@/types";

export const relievers: Reliever[] = [
  // Clinical Coordinator — 2 of 3 target (gap)
  { id: "rel-1", name: "Patricia Nduta", role: "Clinical Coordinator", branchesCovered: ["Umoja 1", "Tassia"], startDate: "2026-06-22", status: "Active", phone: "+254733100001" },
  { id: "rel-2", name: "George Mutiso", role: "Clinical Coordinator", branchesCovered: ["Kangemi"], startDate: "2026-06-25", status: "Active", phone: "+254733100002" },

  // Clinical Officer — 3 of 3 target (met)
  { id: "rel-3", name: "Diana Cherono", role: "Clinical Officer", branchesCovered: ["Shooters", "Benedicata"], startDate: "2026-07-01", status: "Active", phone: "+254733100003" },
  { id: "rel-4", name: "Hassan Juma", role: "Clinical Officer", branchesCovered: ["Zimmerman"], status: "Inactive", phone: "+254733100004", notes: "Deployed at Zimmerman through end of June" },
  { id: "rel-5", name: "Winnie Achieng", role: "Clinical Officer", branchesCovered: ["Langata", "Kitengela"], startDate: "2026-06-20", status: "Active", phone: "+254733100005" },

  // Pharm Tech — 1 of 3 target (critical gap)
  { id: "rel-6", name: "Brian Otieno", role: "Pharm Tech", branchesCovered: ["Pipeline"], startDate: "2026-06-18", status: "Active", phone: "+254733100006" },

  // Lab Technician — 3 of 3 target (met)
  { id: "rel-7", name: "Faith Wambui", role: "Lab Technician", branchesCovered: ["Kawangware", "Kariobangi South"], startDate: "2026-06-15", status: "Active", phone: "+254733100007" },
  { id: "rel-8", name: "Kevin Macharia", role: "Lab Technician", branchesCovered: ["Githurai 45"], startDate: "2026-07-03", status: "Active", phone: "+254733100008" },
  { id: "rel-9", name: "Mercy Wairimu", role: "Lab Technician", branchesCovered: ["Langata"], startDate: "2026-06-22", status: "Active", phone: "+254733100009" },

  // Nurse — 4 of 3 target (surplus)
  { id: "rel-10", name: "Janet Akinyi", role: "Nurse", branchesCovered: ["Umoja 2", "Kimathi"], startDate: "2026-06-20", status: "Active", phone: "+254733100010" },
  { id: "rel-11", name: "Peter Njoroge", role: "Nurse", branchesCovered: ["Shooters"], startDate: "2026-06-25", status: "Active", phone: "+254733100011" },
  { id: "rel-12", name: "Lucy Chebet", role: "Nurse", branchesCovered: ["Sunton", "Luckysummer"], startDate: "2026-07-01", status: "Active", phone: "+254733100012" },
  { id: "rel-13", name: "Dennis Mwangi", role: "Nurse", branchesCovered: ["Kitengela"], status: "Inactive", phone: "+254733100013", notes: "On leave, back Jul 3" },

  // Sonographer — 0 of 3 target (no coverage at all)
];

export const locums: Locum[] = [
  { id: "loc-1", name: "Dr. Wycliffe Otieno", speciality: "General Practice", branchesCovered: ["Eastleigh", "Waiyaki Way"], dailyRate: 18000, licenseNumber: "KMPDC-4421", availability: "Weekends", lastDeployed: "2026-06-08" },
  { id: "loc-2", name: "Dr. Sheila Wanjala", speciality: "Dental", branchesCovered: ["Thika Road"], dailyRate: 22000, licenseNumber: "KMPDC-3387", availability: "On call", lastDeployed: "2026-06-14" },
  { id: "loc-3", name: "Dr. Brian Kiptui", speciality: "Pharmacy", branchesCovered: ["Utawala", "Langata"], dailyRate: 15000, licenseNumber: "PPB-9821", availability: "Weekdays", lastDeployed: "2026-05-30" },
  { id: "loc-4", name: "Dr. Aisha Mohammed", speciality: "General Practice", branchesCovered: ["Kitengela"], dailyRate: 18000, licenseNumber: "KMPDC-5510", availability: "Available now" },
  { id: "loc-5", name: "Dr. Tom Wafula", speciality: "Sonography", branchesCovered: ["Eastleigh"], dailyRate: 16000, licenseNumber: "KMLTTB-2290", availability: "Available now", lastDeployed: "2026-06-01" },
];
