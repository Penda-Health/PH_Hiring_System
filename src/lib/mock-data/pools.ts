import { Reliever, Locum } from "@/types";

export const relievers: Reliever[] = [
  // Clinical Coordinator — 2 of 3 target (gap)
  { id: "rel-1", name: "Patricia Nduta", role: "Clinical Coordinator", branchesCovered: ["Umoja 1", "Tassia"], availabilityDates: "Jun 22 - Jul 5, 2026", status: "Active", phone: "+254733100001" },
  { id: "rel-2", name: "George Mutiso", role: "Clinical Coordinator", branchesCovered: ["Kangemi"], availabilityDates: "Jun 25 - Jul 10, 2026", status: "Active", phone: "+254733100002" },

  // Clinical Officer — 3 of 3 target (met)
  { id: "rel-3", name: "Diana Cherono", role: "Clinical Officer", branchesCovered: ["Shooters", "Benedicata"], availabilityDates: "Jul 1 - Jul 15, 2026", status: "Active", phone: "+254733100003" },
  { id: "rel-4", name: "Hassan Juma", role: "Clinical Officer", branchesCovered: ["Zimmerman"], availabilityDates: "Currently deployed", status: "Inactive", phone: "+254733100004", notes: "Deployed at Zimmerman through end of June" },
  { id: "rel-5", name: "Winnie Achieng", role: "Clinical Officer", branchesCovered: ["Langata", "Kitengela"], availabilityDates: "Jun 20 - Aug 1, 2026", status: "Active", phone: "+254733100005" },

  // Pharm Tech — 1 of 3 target (critical gap)
  { id: "rel-6", name: "Brian Otieno", role: "Pharm Tech", branchesCovered: ["Pipeline"], availabilityDates: "Jun 18 - Jul 2, 2026", status: "Active", phone: "+254733100006" },

  // Lab Technician — 3 of 3 target (met)
  { id: "rel-7", name: "Faith Wambui", role: "Lab Technician", branchesCovered: ["Kawangware", "Kariobangi South"], availabilityDates: "Jun 15 - Jun 30, 2026", status: "Active", phone: "+254733100007" },
  { id: "rel-8", name: "Kevin Macharia", role: "Lab Technician", branchesCovered: ["Githurai 45"], availabilityDates: "Jul 3 - Jul 18, 2026", status: "Active", phone: "+254733100008" },
  { id: "rel-9", name: "Mercy Wairimu", role: "Lab Technician", branchesCovered: ["Langata"], availabilityDates: "Jun 22 - Jul 6, 2026", status: "Active", phone: "+254733100009" },

  // Nurse — 4 of 3 target (surplus)
  { id: "rel-10", name: "Janet Akinyi", role: "Nurse", branchesCovered: ["Umoja 2", "Kimathi"], availabilityDates: "Jun 20 - Jul 5, 2026", status: "Active", phone: "+254733100010" },
  { id: "rel-11", name: "Peter Njoroge", role: "Nurse", branchesCovered: ["Shooters"], availabilityDates: "Jun 25 - Jul 10, 2026", status: "Active", phone: "+254733100011" },
  { id: "rel-12", name: "Lucy Chebet", role: "Nurse", branchesCovered: ["Sunton", "Luckysummer"], availabilityDates: "Jul 1 - Jul 14, 2026", status: "Active", phone: "+254733100012" },
  { id: "rel-13", name: "Dennis Mwangi", role: "Nurse", branchesCovered: ["Kitengela"], availabilityDates: "Jun 19 - Jul 3, 2026", status: "Inactive", phone: "+254733100013", notes: "On leave, back Jul 3" },

  // Sonographer — 0 of 3 target (no coverage at all)
];

export const locums: Locum[] = [
  { id: "loc-1", name: "Dr. Wycliffe Otieno", speciality: "General Practice", branchesCovered: ["Eastleigh", "Waiyaki Way"], dailyRate: 18000, licenseNumber: "KMPDC-4421", availability: "Weekends", lastDeployed: "2026-06-08" },
  { id: "loc-2", name: "Dr. Sheila Wanjala", speciality: "Dental", branchesCovered: ["Thika Road"], dailyRate: 22000, licenseNumber: "KMPDC-3387", availability: "On call", lastDeployed: "2026-06-14" },
  { id: "loc-3", name: "Dr. Brian Kiptui", speciality: "Pharmacy", branchesCovered: ["Utawala", "Langata"], dailyRate: 15000, licenseNumber: "PPB-9821", availability: "Weekdays", lastDeployed: "2026-05-30" },
  { id: "loc-4", name: "Dr. Aisha Mohammed", speciality: "General Practice", branchesCovered: ["Kitengela"], dailyRate: 18000, licenseNumber: "KMPDC-5510", availability: "Available now" },
  { id: "loc-5", name: "Dr. Tom Wafula", speciality: "Sonography", branchesCovered: ["Eastleigh"], dailyRate: 16000, licenseNumber: "KMLTTB-2290", availability: "Available now", lastDeployed: "2026-06-01" },
];
