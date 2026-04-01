/**
 * Bulk Member Import Script
 * ─────────────────────────
 * Maps CSV columns → /api/v1/register API fields
 *
 * Usage:
 *   1. Set BASE_URL below (localhost for dev, Render URL for prod)
 *   2. Set TOKEN (copy from localStorage → "token" after logging in)
 *   3. Run: node import-members.mjs
 */

import axios from 'axios';

// ── CONFIG ────────────────────────────────────────────────────────────────────
const BASE_URL = 'https://wfc-backend-server.onrender.com';         // change to prod URL if needed
const TOKEN    = '';                              // paste your JWT token here
const DELAY_MS = 400;                             // ms between requests (avoid overload)

// ── CSV DATA ──────────────────────────────────────────────────────────────────
const CSV = `admissionNo,memberName,phone,email,bloodGroup,gender,joiningDate,status,balance,address,city,state,country,pincode,membership
NISS0050,Anbu arasan.V id 48,+917904595986,anbuarasu396@gmail.com,O+,male,2026-02-18,active,0,bhavani nagar,-,-,IND,-,Premium 3 months
NISS0008,kural.G,+919360104360,arasankural03@gmail.com,O+,male,2025-12-18,active,0,nerupurichal,-,-,IND,-,Basic 1 month
NISS0017,Dinesh Kumar.K.A,+917904336859,dinesh@gmail.com,O+,male,2025-12-19,active,0,sengapalli,-,-,IND,-,Basic 1 month
NISS0010,surendhiran.S,+919159813633,ssurendhiran68@gmail.com,AB+,male,2025-12-18,active,0,jj nager,-,-,IND,-,Standard 1 months
NISS0011,rajan babu .sk,+919942791020,rajan1234@gmail.com,A+,male,2025-12-18,active,0,uthukkuli,-,-,IND,-,Premium 3 months
NISS0072,kavibharathi.s.s id no 25,+918124824121,-,B+,male,2026-03-21,active,2100,govindapalayam,-,-,IND,-,Premium 3 months
NISS0063,prabu.A id no 65,+916381598865,-,O+,male,2026-03-02,active,0,govindapalayam,-,-,IND,-,Premium 3 months
NISS0062,Basker.R id no 64,+919500744422,-,O+,male,2026-03-02,active,0,Govindapalayam,-,-,IND,-,Premium 3 months
NISS0071,Manikandan id no 76,+919677717970,-,B+,male,2026-03-20,active,1250,kavarainagar,-,-,IND,-,summer offer standard
NISS0012,senthil.R,+917010732407,senthiR007@gmail.com,O+,male,2025-12-18,active,0,uthukkuli,-,-,IND,-,Premium 3 months
NISS0024,Deepak Saran.v.s,+917598352598,deeka123@gmail.com,B+,male,2026-01-02,active,0,vavipalayam,-,-,IND,-,Standard package
NISS0030,Varatharaj.C id-43,+916383298692,cvbvarathu@gmail.com,O+,male,2026-01-05,active,0,Nalakattipalayam,-,-,IND,-,Standard package
NISS0073,manivannan.k id no 77,+919842992073,-,O+,male,2026-03-23,active,1100,Bhavani nagar,-,-,IND,-,Premium 3 months
NISS0022,govindasamy.R id-22,+919791814567,rgovindasamy1989@gmail.com,O+,male,2025-12-29,active,0,kavundampalayam,-,-,IND,-,Standard plan 10 months
NISS0052,santhosh.S id 53,+918300557109,santhoshsaravanan1503@gmail.com,O+,male,2026-02-20,active,0,padayappanagar,-,-,IND,-,Standard 3 months
NISS0051,praveen.S id 50,+919626090974,-,O+,male,2026-02-20,active,0,Padayappanagar,-,-,IND,-,Standard 3 months
NISS0053,Bharath krishnan.S idb54,+918608575766,bs6520990@gmail.com,A+,male,2026-02-20,active,0,padayappanagar,-,-,IND,-,Standard 3 months
NISS0009,Karupusamy.C,+918248282318,karuppusamyk299@gmail.com,O+,male,2025-12-18,active,0,Uthukuli,-,-,IND,-,Premium 6 months
NISS0054,Prem Anand.K.M id 55,+919865704362,-,O+,male,2026-02-20,active,0,-,-,-,-,-,Standard 3 months
NISS0023,Silambarasan.P id-42,+919655634900,silam1234@gmail.com,A+,male,2025-12-30,active,0,kavarai nagar,-,-,IND,-,Standard package
NISS0057,Parameshwaran.P id 59,+919087741816,-,B+,male,2026-02-21,active,0,uthukkuli,-,-,IND,-,Standard 3 months
NISS0056,Dhinakaran.P id 57,+916380305621,-,A+,male,2026-02-21,active,0,uthukkuli rs,-,-,IND,-,Standard 3 months
NISS0055,Jagathesh.R id 56,+918012412457,-,B+,male,2026-02-21,active,0,kk nagar,-,-,IND,-,Standard 3 months
NISS0006,MILAN.V id no 06,+916379321462,milan123@gmail.com,B+,male,2025-12-17,active,0,kaverinagar,-,-,IND,-,Standard 3 months
NISS0002,Yogesh.M,+919361530625,-,O+,male,2025-12-16,active,0,Kaveri nagar,-,-,IND,-,Standard 3 months
NISS0003,Karthikeyan,+918220389681,-,O+,male,2025-12-16,active,0,Sedarpalayam,-,-,IND,-,Standard Plan
NISS0058,Gokul.S id 60,+916379916316,-,O+,male,2026-02-23,active,0,kadapalayam,-,-,IND,-,Premium 3 months
NISS0025,Sanjay.S  id-35,+919042939490,skzoroo7@gmail.com,A+,male,2026-01-02,active,0,uthukkuli rs,-,-,IND,-,standard 2 month
NISS0034,Deepan.J Iâd 12,+916383396988,deebanviveka@gmail.com,AB+,male,2026-01-13,active,0,Morutupalayam,-,-,IND,-,Premium 3 months
NISS0019,swarna latha.R id-30,+918760522272,latha189swarna@gmail.com,O+,male,2025-12-22,active,0,sedarpalayam,-,-,IND,-,Standard 1 months
NISS0033,Mohammed Agmal.S.A id 52,+919159299454,mohammedajmal806@gmail.com,B+,male,2026-01-09,active,0,Uthukkuli RS,-,-,IND,-,Premium 3 months
NISS0032,Pavithra.V Iâd 41,+916380021337,pavithravenkat1411@gmail.com,A+,male,2026-01-08,active,0,Kovandapalsyam,-,-,IND,-,Standard plan 10 months
NISS0035,A.Mohammed Rafik id 09,+919514283447,dhamin.kallil4521@gmail.com,O+,male,2026-01-22,active,0,guruvayurappan nagar,-,-,IND,-,Standard 3 months
NISS0018,jeeva.V id-03,+918270754731,jeevajee400@gmail.com,B+,male,2025-12-22,active,0,chettaipalayam,-,-,IND,-,Standard 1 months
NISS0016,Shanker.C,+919791575242,eertghu@gmail.com,O+,male,2025-12-19,active,0,vavipalayam,-,-,IND,-,Standard plan 10 months
NISS0070,Aswin id no 75,+918220670560,-,O+,male,2026-03-20,active,0,ammannagar,-,-,IND,-,summer offer standard
NISS0026,Sridharan.T,+917695925216,trenzio15@gmail.com,A+,male,2026-01-02,active,0,uthukkuli rs,-,-,IND,-,standard 2 month
NISS0036,Gobesh kannan.P id 10,+917603915997,perumalkannan069@gmail.com,O+,male,2026-01-27,active,0,uthukkuli rs,-,-,IND,-,Basic 1 month
NISS0027,loganthan,+919976319495,logsn1234@gmail.com,A-,male,2026-01-04,active,0,uthukkuli rs,-,-,IND,-,Standard package
NISS0047,Nandha kumar Iâd 34,+919524478746,nandhu95244@gmail.com,B+,male,2026-02-13,active,0,Morattupalayam,-,-,IND,-,Basic 3 months
NISS0059,Prabu,+919942570423,-,-,male,2026-02-24,active,0,-,-,-,-,-,-
NISS0037,T.Prathap id 13,+919790548966,bhavanithenasrasu1983@gmali.com,B+,male,2026-01-28,active,0,guruvayurappan nagar,-,-,IND,-,Standard 3 months
NISS0066,Ranjith.L id no 38,+918754380616,ranjithrslogu@gmail.com,A+,male,2026-03-15,active,0,"7/24,ponniyagoundanur, uthukkuli rs",-,-,IND,-,offer 4 month
NISS0039,Muruganadham.B id no 17,+919003885488,velmurugan2949@gmail.com,B+,male,2026-01-29,active,0,morutupalayam,-,-,IND,-,Standard 3 months
NISS0042,R.Jegathish id 20,+919751226705,jagadishraj835@gmail.com,O+,male,2026-02-02,active,100,guruvayurappan nagar,-,-,IND,-,Standard 3 months
NISS0060,karthik,+919976998739,-,-,male,2026-02-25,active,0,-,-,-,-,-,Standard 3 months
NISS0029,Sanjay.K.S,+918248904251,sanjay@gmail.com,O+,male,2026-01-05,active,0,Guruvayurappan nager,-,-,IND,-,Standard 1 months
NISS0040,santhosh.E,+917449178399,santhoshe822@gmai.com,O+,male,2026-02-01,active,0,uthukkuli rs,-,-,IND,-,Premium 3 months
NISS0046,Tamil Selvan.K id 48,+919080789854,tamilselvan908012@gmail.com,O+,male,2026-02-11,active,0,sedarpalayam,-,-,IND,-,Standard 3 months
NISS0067,Surya.R id no : 70,+919025939837,-,A+,male,2026-03-16,active,0,sedarpalayam,-,-,IND,-,Standard 3 months
NISS0061,Mohmmad Apsar.S id 80,+919047394461,-,O+,male,2026-02-25,active,0,vavipalayam,-,-,IND,-,Standard 3 months
NISS0049,manoj kumar.K id 23,+916380263525,manojklm26@gmail.com,O+,male,2026-02-18,active,0,bhavani nagar,-,-,IND,-,Premium 3 months
NISS0041,Boopathi.S,+919655033589,boopathi@gamil.com,-,male,2026-02-02,active,1800,Kavarai nagar,-,-,IND,-,Basic 3 months
NISS0045,Bakiya Lakshmi.V id 29,+918610456289,bakiya.com@gmail.com,B+,male,2026-02-11,active,0,sedarpalayam,-,-,IND,-,Standard 1 months
NISS0015,Rajesh Kumar.C,+919087098785,rajenbabu007@gmail.com,A+,male,2025-12-19,active,0,Guruvayurappan nager,-,-,IND,-,Premium 3 months
NISS0048,Tamilarasan.S id.no 16,+917092698923,tamilsmart7092@gmail.com,O-,male,2026-02-16,active,0,kodiyapalayam,-,-,IND,-,offer 6 months
NISS0007,priya.R,+919994866316,priyazxx@gmail.com,O+,female,2025-12-17,active,0,sedarpalayam,-,-,IND,-,Premium 3 months
NISS0005,Dhanush.P,+919944589222,dhanushkumar2335@gmail.com,O+,male,2025-12-17,active,0,vk sakthi nager,-,-,IND,-,Premium 3 months
NISS0014,Surendran.D,+919585233666,surendranyu@gmail.com,A+,male,2025-12-19,active,0,Nalakattipalayam,-,-,IND,-,Premium 3 months
NISS0043,shiva.G id 21,+916380005077,metflyji@gmail.com,O+,male,2026-02-07,active,0,vavipalayam,-,-,IND,-,Premium 1 month
NISS0004,Kalaivani.R,+918778238899,jamukalai@gmail.com,O+,male,2025-12-17,active,0,Kara Palayam,-,-,IND,-,Premium Plan 3 months
NISS0021,sastidharan.s id-71,+919942402993,srisasti2993@gmail.com,O+,male,2025-12-26,active,0,guruvayurappan nager,-,-,IND,-,Standard 3 months
NISS0065,Rajesh id no 67,+919629621579,-,-,male,2026-03-10,active,0,gangai nagar,-,-,IND,-,Standard 3 months
NISS0074,aswin kumar.V,+917539951252,-,O+,male,2026-03-27,active,0,morutupalayam,-,-,IND,-,Basic 1 month
NISS0068,Sandhiya.S id no 72,+917871803965,-,A+,male,2026-03-18,active,0,morutupalayam,-,-,IND,-,Standard 1 months
NISS0069,santhosh.M id no 74,+918610242910,-,O+,male,2026-03-19,active,0,morutupalayam,-,-,IND,-,standard 2 month
NISS0020,Arjun.P id-15,+917010404993,suryasanthiya185@gmail.com,O-,male,2025-12-23,active,0,vavipalayam,-,-,IND,-,Standard 3 months
NISS0075,Praveen.S id no 79,+916381854716,-,O+,male,2026-03-28,active,0,Ganga nagar,-,-,IND,-,Premium 3 months
NISS0076,Rajesh kumar.S id no 85,+919345482962,-,O+,male,2026-03-28,active,0,ganga nagar,-,-,IND,-,Premium 3 months
NISS0077,Jaya mani.P id no 87,+916383248757,-,B+,male,2026-03-28,active,0,Periyapalayam,-,-,IND,-,Premium 3 months
NISS0044,Vijay.S id - 28,+917200160170,svijaypavi861994@gmail.com,B+,male,2026-02-10,active,0,Kalipalayam,-,-,IND,-,summer offer standard
NISS0031,Prasanth.R Iâd 44,+916374937627,prasanth2019@gmail.com,O+,male,2026-01-08,active,0,Morutupalayam,-,-,IND,-,Premium 3 months
NISS0064,Praveen kumar.S id no 66,+918903848432,-,B-,male,2026-03-04,active,0,uthukkuli,-,-,IND,-,Standard 1 months`;

// ── HELPERS ───────────────────────────────────────────────────────────────────

/** Parse CSV text → array of objects (handles quoted fields with commas inside) */
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map(line => {
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());

    const obj = {};
    headers.forEach((h, i) => { obj[h] = fields[i] ?? ''; });
    return obj;
  });
}

/** "-" or empty → empty string */
const clean = v => (!v || v === '-') ? '' : v.trim();

/** Capitalize: "male" → "Male" */
const capitalize = s => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';

/**
 * Parse membership string → { packages, duration }
 * Examples:
 *   "Premium 3 months"       → { packages: "Premium", duration: "3" }
 *   "Standard plan 10 months"→ { packages: "Standard", duration: "10" }
 *   "summer offer standard"  → { packages: "Standard", duration: "3" }
 *   "offer 4 month"          → { packages: "Offer",    duration: "4" }
 *   "offer 6 months"         → { packages: "Offer",    duration: "6" }
 */
function parseMembership(membership) {
  if (!membership || membership === '-') return { packages: 'Basic', duration: '1' };

  const lower = membership.toLowerCase();

  let packages = 'Basic';
  if (lower.includes('premium'))                           packages = 'Premium';
  else if (lower.includes('standard') || lower.includes('summer offer standard')) packages = 'Standard';
  else if (lower.includes('offer'))                        packages = 'Offer';
  else if (lower.includes('basic'))                        packages = 'Basic';

  const match = membership.match(/(\d+)\s*month/i);
  const duration = match ? match[1] : '1';

  return { packages, duration };
}

/** Add N months to a YYYY-MM-DD date string */
function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + parseInt(months, 10));
  return d.toISOString().split('T')[0];
}

/** Small sleep between requests */
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function importMembers() {
  const members = parseCSV(CSV);
  console.log(`\n📋 Found ${members.length} members to import\n`);

  const results = { success: [], failed: [] };

  for (let i = 0; i < members.length; i++) {
    const row = members[i];
    const { packages, duration } = parseMembership(row.membership);
    const startDate = row.joiningDate || new Date().toISOString().split('T')[0];
    const endDate   = addMonths(startDate, duration);
    const gender    = capitalize(row.gender) || 'Male';

    // Build form fields matching /api/v1/register
    const payload = {
      name:        row.memberName,
      age:         '',                        // not in CSV
      gender,
      emails:      clean(row.email),
      phone:       clean(row.phone),
      profession:  '',
      address:     [clean(row.address), clean(row.city), clean(row.state)]
                     .filter(Boolean).join(', '),
      pincode:     clean(row.pincode),
      height:      '',
      weight:      '',
      bmi:         '',
      waist:       '',
      hip:         '',
      neck:        '',
      bodyFat:     '',
      bloodPressure: '',
      sugarLevel:  '',
      bloodGroup:  clean(row.bloodGroup) || 'O+',
      issues:      'None',
      description: 'None',
      packages,
      duration,
      services:    'No',
      startDate,
      endDate,
      attendanceId: '',
      admissionNo: row.admissionNo,           // pass if backend supports it
    };

    // Use native FormData (Node 18+)
    const fd = new FormData();
    Object.entries(payload).forEach(([k, v]) => fd.append(k, v));

    const headers = { 'Content-Type': 'multipart/form-data' };
    if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;

    try {
      await axios.post(`${BASE_URL}/api/v1/register`, fd, { headers });
      console.log(`  ✅ [${i + 1}/${members.length}] ${row.admissionNo} — ${row.memberName}`);
      results.success.push(row.admissionNo);
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      console.log(`  ❌ [${i + 1}/${members.length}] ${row.admissionNo} — ${row.memberName} → ${msg}`);
      results.failed.push({ id: row.admissionNo, name: row.memberName, error: msg });
    }

    if (i < members.length - 1) await sleep(DELAY_MS);
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────');
  console.log(`✅ Imported: ${results.success.length}`);
  console.log(`❌ Failed:   ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log('\nFailed records:');
    results.failed.forEach(f => console.log(`  • ${f.id} — ${f.name}: ${f.error}`));
  }

  console.log('─────────────────────────────────────\n');
}

importMembers().catch(console.error);
