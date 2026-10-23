import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface User {
  user_id: number;
  username: string;
  password: string; // bcrypt hash
  full_name: string;
  email: string;
  role: 'admin' | 'organizer' | 'student';
  student_id?: string | null;
  college_department?: string | null;
  status?: 'active' | 'inactive';
  last_login?: string | null;
  created_at: string;
}

export interface Admin {
  admin_id: number;
  username: string;
  password: string;
  full_name: string;
  email: string;
  last_login?: string | null;
  created_at: string;
}

export interface EventItem {
  event_id: number;
  event_name: string;
  event_date: string; // YYYY-MM-DD
  department: string;
  description: string;
  venue: string;
  start_time: string; // HH:mm:ss or HH:mm
  end_time: string;
  registration_deadline: string | null; // ISO string
  capacity: number;
  organizer_id: number | null;
  organizer_name?: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  is_active: number; // 0 or 1 for evaluation
  admin_id: number | null;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Registration {
  registration_id: number;
  event_id: number;
  user_id: number;
  registered_at: string;
  attendance_status: 'registered' | 'attended' | 'absent';
  attended_at: string | null;
  student_name?: string;
  student_id_number?: string;
  student_email?: string;
  college_department?: string;
  has_evaluated?: boolean;
}

export interface SurveySection {
  section_id: number;
  section_name: string;
  section_description: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface SurveyQuestion {
  question_id: number;
  section_id: number;
  question_text: string;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface Evaluation {
  evaluation_id: number;
  event_id: number;
  participant_id: number | null; // stored internally to prevent duplicates; omitted in public anonymous reports
  registration_id: number | null;
  submit_date: string;
  comments: string | null;
}

export interface EvaluationResponse {
  response_id: number;
  evaluation_id: number;
  question_id: number;
  rating: number; // 1 to 5
}

export interface DatabaseState {
  users: User[];
  admins: Admin[];
  events: EventItem[];
  registrations: Registration[];
  survey_sections: SurveySection[];
  survey_questions: SurveyQuestion[];
  evaluations: Evaluation[];
  evaluation_responses: EvaluationResponse[];
}

const DB_FILE = path.resolve(process.cwd(), 'data', 'database.json');

class DatabaseEngine {
  private state: DatabaseState = {
    users: [],
    admins: [],
    events: [],
    registrations: [],
    survey_sections: [],
    survey_questions: [],
    evaluations: [],
    evaluation_responses: [],
  };

  constructor() {
    this.init();
  }

  private init() {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.state = JSON.parse(raw);
        // Ensure all required collections exist
        if (!this.state.users) this.state.users = [];
        if (!this.state.events) this.state.events = [];
        if (!this.state.registrations) this.state.registrations = [];
        if (!this.state.survey_sections) this.state.survey_sections = [];
        if (!this.state.survey_questions) this.state.survey_questions = [];
        if (!this.state.evaluations) this.state.evaluations = [];
        if (!this.state.evaluation_responses) this.state.evaluation_responses = [];
      } catch (e) {
        console.error('Error reading db file, seeding fresh database:', e);
        this.seedInitialData();
      }
    } else {
      this.seedInitialData();
    }
  }

  private save() {
    fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
  }

  public seedInitialData() {
    const hash = (pwd: string) => bcrypt.hashSync(pwd, 10);
    const now = new Date().toISOString();

    const users: User[] = [
      {
        user_id: 1,
        username: 'admin',
        password: hash('admin123'),
        full_name: 'Engr. Juan Dela Cruz',
        email: 'admin@cmu.edu.ph',
        role: 'admin',
        college_department: 'College of Information Sciences and Computing',
        created_at: now,
      },
      {
        user_id: 2,
        username: 'organizer1',
        password: hash('organizer123'),
        full_name: 'Prof. Maria Santos',
        email: 'maria.santos@cmu.edu.ph',
        role: 'organizer',
        college_department: 'Department of Information Technology',
        created_at: now,
      },
      {
        user_id: 3,
        username: 'student1',
        password: hash('student123'),
        full_name: 'Prince Kyle Christian Reston',
        email: 's.reston.princekylechristian@cmu.edu.ph',
        role: 'student',
        student_id: '2023-BSIT-0428',
        college_department: 'BSIT 4B',
        created_at: now,
      },
      {
        user_id: 4,
        username: 'student2',
        password: hash('student123'),
        full_name: 'Alyssa Jean Ramos',
        email: 'alyssa.ramos@cmu.edu.ph',
        role: 'student',
        student_id: '2023-BSIT-0435',
        college_department: 'BSIT 4B',
        created_at: now,
      },
      {
        user_id: 5,
        username: 'student3',
        password: hash('student123'),
        full_name: 'Joshua Dave Flores',
        email: 'joshua.flores@cmu.edu.ph',
        role: 'student',
        student_id: '2023-BSIT-0442',
        college_department: 'BSIT 4B',
        created_at: now,
      },
    ];

    // --- Demo population helpers (seeded PRNG so every reset yields the same data) ---
    const SEED_TODAY = '2026-10-23';
    let seedState = 20261023;
    const rand = () => {
      seedState = (seedState + 0x6d2b79f5) | 0;
      let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const randInt = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
    const shuffle = <T>(arr: T[]): T[] => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    const pad = (n: number) => String(n).padStart(2, '0');
    const shiftDate = (date: string, days: number) => {
      const d = new Date(`${date}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    };

    users.push(
      {
        user_id: 6,
        username: 'organizer2',
        password: hash('organizer123'),
        full_name: 'Dr. Ramon Villanueva',
        email: 'ramon.villanueva@cmu.edu.ph',
        role: 'organizer',
        college_department: 'College of Agriculture',
        created_at: now,
      },
      {
        user_id: 7,
        username: 'organizer3',
        password: hash('organizer123'),
        full_name: 'Prof. Liza Mae Gonzales',
        email: 'lizamae.gonzales@cmu.edu.ph',
        role: 'organizer',
        college_department: 'College of Arts and Sciences',
        created_at: now,
      }
    );

    const studentHash = hash('student123');
    const firstNames = [
      'Mary Grace', 'John Paul', 'Kristine', 'Mark Anthony', 'Angelica', 'Christian', 'Jasmine', 'Rodel',
      'Patricia', 'Jerome', 'Bea', 'Carlo', 'Danica', 'Emmanuel', 'Hazel', 'Kenneth', 'Lovely', 'Nathaniel',
      'Rhea', 'Vincent',
    ];
    const lastNames = [
      'Dela Cruz', 'Bautista', 'Mendoza', 'Garcia', 'Torres', 'Navarro', 'Aquino', 'Castillo', 'Villanueva',
      'Santiago', 'Pascual', 'Domingo', 'Salazar', 'Cabrera', 'Manalo', 'Ocampo', 'Lumbre', 'Sumagang',
      'Tagalog', 'Ybañez', 'Dagohoy',
    ];
    const studentDepts = [
      { name: 'BSIT 4B', code: 'BSIT' },
      { name: 'BSIT 3A', code: 'BSIT' },
      { name: 'BS Computer Science 4A', code: 'BSCS' },
      { name: 'BS Agriculture 3B', code: 'BSA' },
      { name: 'BS Secondary Education 2A', code: 'BSED' },
      { name: 'BS Nursing 3A', code: 'BSN' },
      { name: 'BS Civil Engineering 4A', code: 'BSCE' },
    ];
    const generatedStudentIds: number[] = [];
    for (let i = 0; i < 40; i++) {
      // (i % 20, i % 21) never repeats for i < 420, so names stay unique
      const first = firstNames[i % firstNames.length];
      const last = lastNames[i % lastNames.length];
      const dept = studentDepts[i % studentDepts.length];
      const userId = 8 + i;
      generatedStudentIds.push(userId);
      users.push({
        user_id: userId,
        username: `student${i + 4}`,
        password: studentHash,
        full_name: `${first} ${last}`,
        email: `${first}.${last}@cmu.edu.ph`.toLowerCase().replace(/ñ/g, 'n').replace(/\s+/g, ''),
        role: 'student',
        student_id: `20${22 + (i % 4)}-${dept.code}-${String(500 + i).padStart(4, '0')}`,
        college_department: dept.name,
        status: i % 17 === 16 ? 'inactive' : 'active',
        created_at: now,
      });
    }

    const admins: Admin[] = [
      {
        admin_id: 1,
        username: 'admin',
        password: hash('admin123'),
        full_name: 'Engr. Juan Dela Cruz',
        email: 'admin@cmu.edu.ph',
        created_at: now,
      },
    ];

    const survey_sections: SurveySection[] = [
      {
        section_id: 1,
        section_name: 'Accommodation and Venue',
        section_description: 'Evaluation of the venue facilities and accessibility',
        display_order: 1,
        created_at: now,
        updated_at: now,
      },
      {
        section_id: 2,
        section_name: 'Spokesperson / Speaker Evaluation',
        section_description: 'Assessment of speaker performance and content delivery',
        display_order: 2,
        created_at: now,
        updated_at: now,
      },
      {
        section_id: 3,
        section_name: 'Food and Refreshments',
        section_description: 'Feedback on catering and refreshments provided',
        display_order: 3,
        created_at: now,
        updated_at: now,
      },
      {
        section_id: 4,
        section_name: 'Event Coordination and Overall Experience',
        section_description: 'General satisfaction with event organization and experience',
        display_order: 4,
        created_at: now,
        updated_at: now,
      },
    ];

    const survey_questions: SurveyQuestion[] = [
      // Section 1
      { question_id: 1, section_id: 1, question_text: 'Was the venue easily accessible and clearly signposted?', is_required: true, created_at: now, updated_at: now },
      { question_id: 2, section_id: 1, question_text: 'Was the accommodation (if provided) comfortable and clean?', is_required: true, created_at: now, updated_at: now },
      { question_id: 3, section_id: 1, question_text: 'Were restroom facilities clean and well-maintained?', is_required: true, created_at: now, updated_at: now },
      { question_id: 4, section_id: 1, question_text: 'Was the venue appropriate for the number of participants?', is_required: true, created_at: now, updated_at: now },
      { question_id: 5, section_id: 1, question_text: 'Did you feel safe and secure throughout the event?', is_required: true, created_at: now, updated_at: now },

      // Section 2
      { question_id: 6, section_id: 2, question_text: 'How would you rate the speaker/s knowledge and expertise?', is_required: true, created_at: now, updated_at: now },
      { question_id: 7, section_id: 2, question_text: 'Was the speaker engaging and effective in delivering their message?', is_required: true, created_at: now, updated_at: now },
      { question_id: 8, section_id: 2, question_text: 'Did the speaker encourage questions and interaction?', is_required: true, created_at: now, updated_at: now },
      { question_id: 9, section_id: 2, question_text: 'Were the topics covered relevant and well-organized?', is_required: true, created_at: now, updated_at: now },
      { question_id: 10, section_id: 2, question_text: 'Did the speaker stay on topic and manage time well?', is_required: true, created_at: now, updated_at: now },

      // Section 3
      { question_id: 11, section_id: 3, question_text: 'Were food and refreshments served on time?', is_required: true, created_at: now, updated_at: now },
      { question_id: 12, section_id: 3, question_text: 'Was there a variety of food options available (e.g., vegetarian, halal)?', is_required: true, created_at: now, updated_at: now },
      { question_id: 13, section_id: 3, question_text: 'How would you rate the quality and taste of the food?', is_required: true, created_at: now, updated_at: now },
      { question_id: 14, section_id: 3, question_text: 'Were dietary needs or restrictions considered?', is_required: true, created_at: now, updated_at: now },
      { question_id: 15, section_id: 3, question_text: 'Was the serving area clean and organized?', is_required: true, created_at: now, updated_at: now },

      // Section 4
      { question_id: 16, section_id: 4, question_text: 'Was the event schedule followed properly?', is_required: true, created_at: now, updated_at: now },
      { question_id: 17, section_id: 4, question_text: 'Were event staff and volunteers helpful and courteous?', is_required: true, created_at: now, updated_at: now },
      { question_id: 18, section_id: 4, question_text: 'How would you rate the overall flow and organization of the event?', is_required: true, created_at: now, updated_at: now },
      { question_id: 19, section_id: 4, question_text: 'Did the event meet your expectations?', is_required: true, created_at: now, updated_at: now },
      { question_id: 20, section_id: 4, question_text: 'Would you recommend this event to others or attend again?', is_required: true, created_at: now, updated_at: now },
    ];

    const events: EventItem[] = [
      {
        event_id: 1,
        event_name: 'CMU IT Week 2026: Enterprise Systems & Cloud Integration',
        event_date: '2026-10-20',
        department: 'College of Information Sciences and Computing',
        description: 'Annual flagship symposium bringing together industry architects, IT faculty, and graduating seniors to explore microservices, event-driven architectures, and REST API integration in enterprise applications.',
        venue: 'CMU University Convention Center - Main Hall',
        start_time: '08:30:00',
        end_time: '17:00:00',
        registration_deadline: '2026-10-19T23:59:00',
        capacity: 250,
        organizer_id: 2,
        approval_status: 'approved',
        is_active: 1, // Activated for evaluation!
        admin_id: 1,
        image_url: '/src/assets/images/university_tech_summit_1792726541628.jpg',
        created_at: now,
        updated_at: now,
      },
      {
        event_id: 2,
        event_name: 'University AI & Cloud Architecture Summit',
        event_date: '2026-10-24',
        department: 'Department of Information Technology',
        description: 'Hands-on technical workshop exploring modern full-stack development, automated container workflows, REST API contracts, and real-time database management.',
        venue: 'CISC Multimedia Laboratory 3',
        start_time: '09:00:00',
        end_time: '16:00:00',
        registration_deadline: '2026-10-23T18:00:00',
        capacity: 80,
        organizer_id: 2,
        approval_status: 'approved',
        is_active: 1,
        admin_id: 1,
        image_url: '/src/assets/images/cmu_campus_landmark_1792726540611.jpg',
        created_at: now,
        updated_at: now,
      },
      {
        event_id: 3,
        event_name: 'BSIT 4B Capstone Research Colloquium',
        event_date: '2026-10-28',
        department: 'College of Information Sciences and Computing',
        description: 'Final thesis defense presentation and peer review for System Integration and Architecture projects, showcasing university automated solutions and database systems.',
        venue: 'University Audio-Visual Center',
        start_time: '13:00:00',
        end_time: '18:00:00',
        registration_deadline: '2026-10-27T12:00:00',
        capacity: 120,
        organizer_id: 2,
        approval_status: 'approved',
        is_active: 0,
        admin_id: 1,
        image_url: '/src/assets/images/university_tech_summit_1792726541628.jpg',
        created_at: now,
        updated_at: now,
      },
      {
        event_id: 4,
        event_name: 'Central Mindanao Agri-Tech Hackathon',
        event_date: '2026-11-05',
        department: 'College of Agriculture & CISC',
        description: 'Inter-collegiate 48-hour hackathon for building smart IoT sensors and web management systems for agricultural yield forecasting in Region X.',
        venue: 'Farmers Training Center, CMU Campus',
        start_time: '08:00:00',
        end_time: '18:00:00',
        registration_deadline: '2026-11-02T23:59:00',
        capacity: 100,
        organizer_id: 2,
        approval_status: 'pending', // Pending admin approval demo!
        is_active: 0,
        admin_id: null,
        image_url: '/src/assets/images/cmu_campus_landmark_1792726540611.jpg',
        created_at: now,
        updated_at: now,
      },
    ];

    // Additional events covering every lifecycle state: completed, upcoming, pending, rejected
    type ExtraEvent = Pick<
      EventItem,
      'event_name' | 'event_date' | 'department' | 'description' | 'venue' | 'start_time' | 'end_time' | 'capacity' | 'organizer_id' | 'approval_status' | 'is_active'
    > & { rejection_reason?: string };

    const extraEvents: ExtraEvent[] = [
      // 5-10: completed events
      {
        event_name: 'Freshmen Orientation & Campus Tour 2026',
        event_date: '2026-08-12',
        department: 'Office of Student Affairs',
        description: 'Welcome program for incoming first-year students covering university policies, student services, and a guided tour of the CMU campus.',
        venue: 'CMU Grandstand',
        start_time: '08:00:00',
        end_time: '15:00:00',
        capacity: 300,
        organizer_id: 2,
        approval_status: 'approved',
        is_active: 0,
      },
      {
        event_name: 'Research Ethics and Data Privacy Seminar',
        event_date: '2026-09-03',
        department: 'College of Arts and Sciences',
        description: 'Seminar on responsible research conduct, informed consent, and compliance with the Data Privacy Act of 2012 for student researchers.',
        venue: 'CAS Function Hall',
        start_time: '13:00:00',
        end_time: '17:00:00',
        capacity: 80,
        organizer_id: 7,
        approval_status: 'approved',
        is_active: 1,
      },
      {
        event_name: 'Organic Farming Field Demonstration',
        event_date: '2026-09-18',
        department: 'College of Agriculture',
        description: 'Hands-on demonstration of vermicomposting, natural pest control, and organic vegetable production at the university demo farm.',
        venue: 'CMU Organic Demo Farm',
        start_time: '07:30:00',
        end_time: '12:00:00',
        capacity: 60,
        organizer_id: 6,
        approval_status: 'approved',
        is_active: 1,
      },
      {
        event_name: 'Web Development Bootcamp: React & REST APIs',
        event_date: '2026-09-26',
        department: 'College of Information Sciences and Computing',
        description: 'Full-day bootcamp building a React front end connected to a REST API, covering components, state management, and API integration.',
        venue: 'CISC Computer Laboratory 1',
        start_time: '08:00:00',
        end_time: '17:00:00',
        capacity: 45,
        organizer_id: 2,
        approval_status: 'approved',
        is_active: 1,
      },
      {
        event_name: 'Mental Health Awareness Forum',
        event_date: '2026-10-08',
        department: 'Guidance and Counseling Office',
        description: 'Open forum with licensed counselors on stress management, academic burnout, and available university wellness services.',
        venue: 'University Audio-Visual Center',
        start_time: '09:00:00',
        end_time: '12:00:00',
        capacity: 150,
        organizer_id: 7,
        approval_status: 'approved',
        is_active: 1,
      },
      {
        event_name: 'Inter-College Quiz Bee 2026',
        event_date: '2026-10-15',
        department: 'College of Education',
        description: 'Annual academic quiz competition between college representatives covering science, mathematics, history, and current events.',
        venue: 'College of Education Gymnasium',
        start_time: '13:00:00',
        end_time: '17:00:00',
        capacity: 200,
        organizer_id: 6,
        approval_status: 'approved',
        is_active: 1,
      },
      // 11-13: upcoming approved events
      {
        event_name: 'Cybersecurity Awareness Workshop',
        event_date: '2026-11-12',
        department: 'College of Information Sciences and Computing',
        description: 'Workshop on phishing detection, password hygiene, and securing personal devices and university accounts.',
        venue: 'CISC Multimedia Laboratory 2',
        start_time: '13:00:00',
        end_time: '16:30:00',
        capacity: 60,
        organizer_id: 2,
        approval_status: 'approved',
        is_active: 0,
      },
      {
        event_name: 'CMU Foundation Day Cultural Night',
        event_date: '2026-11-20',
        department: 'Office of Student Affairs',
        description: 'Evening celebration of the university founding anniversary featuring cultural dance troupes, choir performances, and student band showcases.',
        venue: 'CMU University Convention Center - Main Hall',
        start_time: '18:00:00',
        end_time: '22:00:00',
        capacity: 500,
        organizer_id: 7,
        approval_status: 'approved',
        is_active: 0,
      },
      {
        event_name: 'Sustainable Agriculture Research Congress',
        event_date: '2026-12-03',
        department: 'College of Agriculture',
        description: 'Presentation of faculty and student research on climate-resilient crops, soil health, and smart farming technologies in Mindanao.',
        venue: 'Farmers Training Center, CMU Campus',
        start_time: '08:00:00',
        end_time: '17:00:00',
        capacity: 120,
        organizer_id: 6,
        approval_status: 'approved',
        is_active: 0,
      },
      // 14-15: awaiting approval
      {
        event_name: 'Mobile App Development Hackathon',
        event_date: '2026-12-10',
        department: 'College of Information Sciences and Computing',
        description: '24-hour team hackathon building mobile apps that solve campus problems, judged by industry partners.',
        venue: 'CISC Building Lobby & Laboratories',
        start_time: '08:00:00',
        end_time: '20:00:00',
        capacity: 90,
        organizer_id: 2,
        approval_status: 'pending',
        is_active: 0,
      },
      {
        event_name: 'Campus Clean-Up and Tree Planting Drive',
        event_date: '2026-11-15',
        department: 'Office of Student Affairs',
        description: 'Community service activity cleaning campus waterways and planting native tree seedlings along the university perimeter.',
        venue: 'CMU Main Gate Assembly Area',
        start_time: '06:00:00',
        end_time: '11:00:00',
        capacity: 200,
        organizer_id: 7,
        approval_status: 'pending',
        is_active: 0,
      },
      // 16-17: rejected proposals
      {
        event_name: 'Overnight LAN Gaming Tournament',
        event_date: '2026-11-07',
        department: 'College of Information Sciences and Computing',
        description: 'Overnight esports tournament held in the computer laboratories with teams from different colleges.',
        venue: 'CISC Computer Laboratories 1-3',
        start_time: '18:00:00',
        end_time: '23:59:00',
        capacity: 64,
        organizer_id: 2,
        approval_status: 'rejected',
        is_active: 0,
        rejection_reason: 'Overnight activities inside campus facilities are not permitted under the student activities policy.',
      },
      {
        event_name: 'Off-Campus Team Building Excursion',
        event_date: '2026-11-28',
        department: 'College of Arts and Sciences',
        description: 'Two-day team building activity for student officers at a beach resort outside the province.',
        venue: 'Off-campus (Camiguin Island)',
        start_time: '06:00:00',
        end_time: '18:00:00',
        capacity: 40,
        organizer_id: 7,
        approval_status: 'rejected',
        is_active: 0,
        rejection_reason: 'Insufficient risk assessment and missing parental consent forms for off-campus travel.',
      },
    ];

    extraEvents.forEach((evt, idx) => {
      events.push({
        ...evt,
        event_id: 5 + idx,
        registration_deadline: `${shiftDate(evt.event_date, -1)}T23:59:00`,
        rejection_reason: evt.rejection_reason ?? null,
        admin_id: evt.approval_status === 'pending' ? null : 1,
        image_url:
          idx % 2 === 0
            ? '/src/assets/images/university_tech_summit_1792726541628.jpg'
            : '/src/assets/images/cmu_campus_landmark_1792726540611.jpg',
        created_at: now,
        updated_at: now,
      });
    });

    // Seed registrations
    const registrations: Registration[] = [
      {
        registration_id: 1,
        event_id: 1,
        user_id: 3, // Prince Kyle Christian Reston
        registered_at: '2026-10-18T10:00:00Z',
        attendance_status: 'attended', // confirmed attendee, evaluation left open for testing
        attended_at: '2026-10-20T08:25:00Z',
      },
      {
        registration_id: 2,
        event_id: 1,
        user_id: 4, // Alyssa Jean Ramos
        registered_at: '2026-10-18T11:15:00Z',
        attendance_status: 'attended',
        attended_at: '2026-10-20T08:40:00Z',
      },
      {
        registration_id: 3,
        event_id: 1,
        user_id: 5, // Joshua Dave Flores
        registered_at: '2026-10-19T09:30:00Z',
        attendance_status: 'registered', // registered but not checked in
        attended_at: null,
      },
      {
        registration_id: 4,
        event_id: 2,
        user_id: 3,
        registered_at: '2026-10-21T14:20:00Z',
        attendance_status: 'registered',
        attended_at: null,
      },
    ];

    const evaluations: Evaluation[] = [
      {
        evaluation_id: 1,
        event_id: 1,
        participant_id: 4,
        registration_id: 2,
        submit_date: '2026-10-20T17:15:00Z',
        comments: 'Outstanding keynote speakers and great organization! The technical demonstration on REST API design was particularly insightful for our SIA subject.',
      },
    ];

    const evaluation_responses: EvaluationResponse[] = survey_questions.map((q, idx) => ({
      response_id: idx + 1,
      evaluation_id: 1,
      question_id: q.question_id,
      rating: [5, 4, 5, 4, 5, 5, 5, 4, 5, 4, 4, 4, 5, 4, 5, 5, 5, 4, 5, 5][idx % 20],
    }));

    // Typical rating per completed event; individual answers vary around it
    const eventQuality: Record<number, number> = { 1: 4.4, 5: 4.5, 6: 3.9, 7: 4.2, 8: 4.6, 9: 4.1, 10: 3.5 };
    const commentPool = [
      'Very informative and well organized. Looking forward to the next one!',
      'The speakers were knowledgeable but the program started late.',
      'Venue was too warm in the afternoon. Better ventilation please.',
      'Snacks ran out before everyone was served.',
      'I learned a lot of practical skills that I can apply to our projects.',
      'Registration at the entrance was quick and smooth.',
      'The sound system had issues at the back of the hall.',
      'Great activity! More hands-on sessions would be appreciated.',
      'Topics were relevant to our course. Thank you to the organizers.',
      'Please provide more vegetarian food options next time.',
      'The time allotted for open forum was too short.',
      'Excellent facilitators, very approachable and helpful.',
      'Handouts or slides should be shared with participants after the event.',
      'One of the best university events I have attended this semester.',
    ];

    const addRegistration = (eventId: number, userId: number, status: Registration['attendance_status']) => {
      const evt = events.find((e) => e.event_id === eventId)!;
      let regDate = shiftDate(evt.event_date, -randInt(1, 12));
      if (regDate >= SEED_TODAY) regDate = shiftDate(SEED_TODAY, -randInt(1, 5));
      const reg: Registration = {
        registration_id: registrations.length + 1,
        event_id: eventId,
        user_id: userId,
        registered_at: `${regDate}T${pad(randInt(7, 21))}:${pad(randInt(0, 59))}:00Z`,
        attendance_status: status,
        attended_at: status === 'attended' ? `${evt.event_date}T${pad(randInt(7, 8))}:${pad(randInt(0, 59))}:00Z` : null,
      };
      registrations.push(reg);
      return reg;
    };

    const addEvaluation = (reg: Registration) => {
      const evt = events.find((e) => e.event_id === reg.event_id)!;
      const quality = eventQuality[reg.event_id] ?? 4;
      const evaluationId = evaluations.length + 1;
      evaluations.push({
        evaluation_id: evaluationId,
        event_id: reg.event_id,
        participant_id: reg.user_id,
        registration_id: reg.registration_id,
        submit_date: `${evt.event_date}T${pad(randInt(16, 21))}:${pad(randInt(0, 59))}:00Z`,
        comments: rand() < 0.55 ? commentPool[Math.floor(rand() * commentPool.length)] : null,
      });
      for (const q of survey_questions) {
        // Food tends to score lower, speakers slightly higher
        const sectionBias = q.section_id === 3 ? -0.35 : q.section_id === 2 ? 0.15 : 0;
        evaluation_responses.push({
          response_id: evaluation_responses.length + 1,
          evaluation_id: evaluationId,
          question_id: q.question_id,
          rating: Math.min(5, Math.max(1, Math.round(quality + sectionBias + (rand() - 0.5) * 2))),
        });
      }
    };

    // Demo accounts get a predictable history: [event, user, attendance, evaluated]
    const demoHistory: [number, number, Registration['attendance_status'], boolean][] = [
      [5, 3, 'attended', true],
      [8, 3, 'attended', true],
      [9, 3, 'attended', false], // open evaluation for testing
      [11, 3, 'registered', false],
      [12, 3, 'registered', false],
      [6, 4, 'attended', true],
      [8, 4, 'attended', true],
      [3, 4, 'registered', false],
      [7, 5, 'absent', false],
      [10, 5, 'attended', true],
      [2, 5, 'registered', false],
    ];
    for (const [eventId, userId, status, evaluated] of demoHistory) {
      const reg = addRegistration(eventId, userId, status);
      if (evaluated) addEvaluation(reg);
    }

    // Generated students fill the remaining seats
    const registrationTargets: [number, number][] = [
      [5, 34], [6, 22], [7, 18], [8, 30], [9, 26], [10, 20], [1, 20],
      [2, 15], [3, 12], [11, 14], [12, 25], [13, 9],
    ];
    for (const [eventId, count] of registrationTargets) {
      const evt = events.find((e) => e.event_id === eventId)!;
      const isPast = evt.event_date < SEED_TODAY;
      for (const userId of shuffle(generatedStudentIds).slice(0, count)) {
        const status: Registration['attendance_status'] = isPast ? (rand() < 0.82 ? 'attended' : 'absent') : 'registered';
        const reg = addRegistration(eventId, userId, status);
        if (status === 'attended' && rand() < 0.7) addEvaluation(reg);
      }
    }

    this.state = {
      users,
      admins,
      events,
      registrations,
      survey_sections,
      survey_questions,
      evaluations,
      evaluation_responses,
    };

    this.save();
  }

  // --- Users & Auth ---
  public findUserByUsername(username: string): User | undefined {
    return this.state.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  public findUserById(id: number): User | undefined {
    return this.state.users.find(u => u.user_id === id);
  }

  public getAllUsers(): Omit<User, 'password'>[] {
    return this.state.users.map(({ password, ...u }) => u);
  }

  public createUser(userData: {
    username: string;
    passwordPlain: string;
    full_name: string;
    email: string;
    role: 'admin' | 'organizer' | 'student';
    student_id?: string | null;
    college_department?: string | null;
  }): Omit<User, 'password'> {
    if (this.findUserByUsername(userData.username)) {
      throw new Error('Username already exists');
    }
    if (this.state.users.some(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
      throw new Error('Email address already registered');
    }

    const newId = (this.state.users.length ? Math.max(...this.state.users.map(u => u.user_id)) : 0) + 1;
    const now = new Date().toISOString();
    const newUser: User = {
      user_id: newId,
      username: userData.username,
      password: bcrypt.hashSync(userData.passwordPlain, 10),
      full_name: userData.full_name,
      email: userData.email,
      role: userData.role,
      student_id: userData.student_id || null,
      college_department: userData.college_department || null,
      created_at: now,
    };

    this.state.users.push(newUser);

    if (userData.role === 'admin') {
      const adminId = (this.state.admins.length ? Math.max(...this.state.admins.map(a => a.admin_id)) : 0) + 1;
      this.state.admins.push({
        admin_id: adminId,
        username: newUser.username,
        password: newUser.password,
        full_name: newUser.full_name,
        email: newUser.email,
        created_at: now,
      });
    }

    this.save();
    const { password, ...safeUser } = newUser;
    return safeUser;
  }

  public updateUser(userId: number, data: {
    full_name?: string;
    email?: string;
    role?: 'admin' | 'organizer' | 'student';
    student_id?: string | null;
    college_department?: string | null;
    passwordPlain?: string;
  }): Omit<User, 'password'> {
    const user = this.state.users.find(u => u.user_id === userId);
    if (!user) throw new Error('User not found');

    if (data.full_name) user.full_name = data.full_name.trim();
    if (data.email) user.email = data.email.trim();
    if (data.role) user.role = data.role;
    if (data.student_id !== undefined) user.student_id = data.student_id;
    if (data.college_department !== undefined) user.college_department = data.college_department;
    if (data.passwordPlain) user.password = bcrypt.hashSync(data.passwordPlain, 10);

    this.save();
    const { password, ...safeUser } = user;
    return safeUser;
  }

  public toggleUserStatus(userId: number): Omit<User, 'password'> {
    const user = this.state.users.find(u => u.user_id === userId);
    if (!user) throw new Error('User not found');
    user.status = user.status === 'inactive' ? 'active' : 'inactive';
    this.save();
    const { password, ...safeUser } = user;
    return safeUser;
  }

  public getUserEvaluations(userId: number) {
    const evals = this.state.evaluations.filter(e => e.participant_id === userId);
    return evals.map(ev => {
      const event = this.state.events.find(e => e.event_id === ev.event_id);
      const responses = this.state.evaluation_responses.filter(r => r.evaluation_id === ev.evaluation_id);
      const avg = responses.length > 0 ? (responses.reduce((a, b) => a + b.rating, 0) / responses.length) : 0;
      return {
        ...ev,
        event_name: event?.event_name || 'CMU Event',
        event_date: event?.event_date || '',
        department: event?.department || '',
        venue: event?.venue || '',
        average_given_rating: Number(avg.toFixed(2)),
        responses_count: responses.length,
      };
    });
  }

  // --- Events ---
  public getEvents(options: {
    all?: boolean;
    organizer_id?: number;
    department?: string;
    status?: string;
    search?: string;
  }): (EventItem & { registered_count: number; attended_count: number; evaluation_count: number; user_registered?: boolean; user_attendance?: string })[] {
    let list = [...this.state.events];

    // If not 'all', public list shows only approved events
    if (!options.all) {
      list = list.filter(e => e.approval_status === 'approved');
    }

    if (options.organizer_id) {
      list = list.filter(e => e.organizer_id === options.organizer_id);
    }

    if (options.department && options.department !== 'All') {
      list = list.filter(e => e.department.toLowerCase().includes(options.department!.toLowerCase()));
    }

    if (options.search) {
      const q = options.search.toLowerCase();
      list = list.filter(e =>
        e.event_name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q)
      );
    }

    return list.map(evt => {
      const eventRegs = this.state.registrations.filter(r => r.event_id === evt.event_id);
      const attendedCount = eventRegs.filter(r => r.attendance_status === 'attended').length;
      const evalCount = this.state.evaluations.filter(ev => ev.event_id === evt.event_id).length;
      const organizer = this.state.users.find(u => u.user_id === evt.organizer_id);

      return {
        ...evt,
        organizer_name: organizer?.full_name || 'Central Mindanao University',
        registered_count: eventRegs.length,
        attended_count: attendedCount,
        evaluation_count: evalCount,
      };
    }).sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
  }

  public getEventById(id: number): (EventItem & { registered_count: number; attended_count: number; evaluation_count: number; organizer_name: string }) | null {
    const evt = this.state.events.find(e => e.event_id === id);
    if (!evt) return null;

    const eventRegs = this.state.registrations.filter(r => r.event_id === evt.event_id);
    const attendedCount = eventRegs.filter(r => r.attendance_status === 'attended').length;
    const evalCount = this.state.evaluations.filter(ev => ev.event_id === evt.event_id).length;
    const organizer = this.state.users.find(u => u.user_id === evt.organizer_id);

    return {
      ...evt,
      organizer_name: organizer?.full_name || 'CMU Organizing Committee',
      registered_count: eventRegs.length,
      attended_count: attendedCount,
      evaluation_count: evalCount,
    };
  }

  public createEvent(data: {
    event_name: string;
    event_date: string;
    department: string;
    description: string;
    venue: string;
    start_time: string;
    end_time: string;
    registration_deadline?: string | null;
    capacity: number;
    organizer_id: number;
    is_admin?: boolean;
    image_url?: string;
  }): EventItem {
    const newId = (this.state.events.length ? Math.max(...this.state.events.map(e => e.event_id)) : 0) + 1;
    const now = new Date().toISOString();

    const newEvent: EventItem = {
      event_id: newId,
      event_name: data.event_name.trim(),
      event_date: data.event_date,
      department: data.department.trim(),
      description: data.description.trim(),
      venue: data.venue.trim() || 'CMU Convention Center',
      start_time: data.start_time || '08:00:00',
      end_time: data.end_time || '17:00:00',
      registration_deadline: data.registration_deadline || null,
      capacity: Number(data.capacity) || 100,
      organizer_id: data.organizer_id,
      // If created by an admin directly, pre-approved; if submitted by organizer, starts as pending
      approval_status: data.is_admin ? 'approved' : 'pending',
      is_active: data.is_admin ? 1 : 0,
      admin_id: data.is_admin ? data.organizer_id : null,
      image_url: data.image_url || '/src/assets/images/university_tech_summit_1792726541628.jpg',
      created_at: now,
      updated_at: now,
    };

    this.state.events.push(newEvent);
    this.save();
    return newEvent;
  }

  public updateEvent(id: number, data: Partial<EventItem>): EventItem {
    const idx = this.state.events.findIndex(e => e.event_id === id);
    if (idx === -1) throw new Error('Event not found');

    const existing = this.state.events[idx];
    const updated: EventItem = {
      ...existing,
      ...data,
      event_id: existing.event_id,
      updated_at: new Date().toISOString(),
    };

    this.state.events[idx] = updated;
    this.save();
    return updated;
  }

  public setEventApproval(id: number, status: 'approved' | 'rejected', adminId: number, rejection_reason?: string): EventItem {
    const evt = this.state.events.find(e => e.event_id === id);
    if (!evt) throw new Error('Event not found');

    evt.approval_status = status;
    evt.admin_id = adminId;
    evt.rejection_reason = status === 'rejected' ? (rejection_reason || 'Does not meet university event guidelines') : null;
    // Approved events open for evaluation by default; rejected (or revoked) ones close it
    evt.is_active = status === 'approved' ? 1 : 0;
    evt.updated_at = new Date().toISOString();
    this.save();
    return evt;
  }

  public setEventStatus(id: number, is_active: number): EventItem {
    const evt = this.state.events.find(e => e.event_id === id);
    if (!evt) throw new Error('Event not found');

    evt.is_active = is_active ? 1 : 0;
    evt.updated_at = new Date().toISOString();
    this.save();
    return evt;
  }

  public deleteEvent(id: number): boolean {
    const idx = this.state.events.findIndex(e => e.event_id === id);
    if (idx === -1) return false;

    this.state.events.splice(idx, 1);
    // Cascade delete registrations, evaluations, evaluation_responses
    const evalIds = this.state.evaluations.filter(ev => ev.event_id === id).map(ev => ev.evaluation_id);
    this.state.evaluations = this.state.evaluations.filter(ev => ev.event_id !== id);
    this.state.evaluation_responses = this.state.evaluation_responses.filter(er => !evalIds.includes(er.evaluation_id));
    this.state.registrations = this.state.registrations.filter(r => r.event_id !== id);

    this.save();
    return true;
  }

  // --- Registrations ---
  public registerParticipant(eventId: number, userId: number): Registration {
    const evt = this.state.events.find(e => e.event_id === eventId);
    if (!evt) throw new Error('Event not found');

    if (evt.approval_status !== 'approved') {
      throw new Error('Registration is only available for approved events');
    }

    // Check deadline if set
    if (evt.registration_deadline) {
      const deadline = new Date(evt.registration_deadline).getTime();
      if (Date.now() > deadline) {
        throw new Error('Registration deadline has passed for this event');
      }
    }

    // Check capacity
    const currentRegs = this.state.registrations.filter(r => r.event_id === eventId);
    if (currentRegs.length >= evt.capacity) {
      throw new Error(`Event has reached maximum capacity of ${evt.capacity} participants`);
    }

    // Check duplicate
    const existing = this.state.registrations.find(r => r.event_id === eventId && r.user_id === userId);
    if (existing) {
      throw new Error('You are already registered for this event');
    }

    const regId = (this.state.registrations.length ? Math.max(...this.state.registrations.map(r => r.registration_id)) : 0) + 1;
    const newReg: Registration = {
      registration_id: regId,
      event_id: eventId,
      user_id: userId,
      registered_at: new Date().toISOString(),
      attendance_status: 'registered',
      attended_at: null,
    };

    this.state.registrations.push(newReg);
    this.save();
    return newReg;
  }

  public getEventRegistrations(eventId: number): Registration[] {
    const regs = this.state.registrations.filter(r => r.event_id === eventId);
    return regs.map(r => {
      const student = this.state.users.find(u => u.user_id === r.user_id);
      const hasEvaluated = this.state.evaluations.some(ev => ev.event_id === eventId && ev.participant_id === r.user_id);
      return {
        ...r,
        student_name: student?.full_name || 'Participant',
        student_id_number: student?.student_id || 'N/A',
        student_email: student?.email || '',
        college_department: student?.college_department || '',
        has_evaluated: hasEvaluated,
      };
    });
  }

  public getUserRegistrations(userId: number): (Registration & { event: EventItem })[] {
    const regs = this.state.registrations.filter(r => r.user_id === userId);
    const results: (Registration & { event: EventItem })[] = [];

    for (const r of regs) {
      const evt = this.state.events.find(e => e.event_id === r.event_id);
      if (evt) {
        const hasEvaluated = this.state.evaluations.some(ev => ev.event_id === r.event_id && ev.participant_id === userId);
        results.push({
          ...r,
          has_evaluated: hasEvaluated,
          event: evt,
        });
      }
    }

    return results.sort((a, b) => new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime());
  }

  public updateAttendance(registrationId: number, status: 'registered' | 'attended' | 'absent'): Registration {
    const reg = this.state.registrations.find(r => r.registration_id === registrationId);
    if (!reg) throw new Error('Registration record not found');

    reg.attendance_status = status;
    reg.attended_at = status === 'attended' ? new Date().toISOString() : null;
    this.save();
    return reg;
  }

  public cancelRegistration(registrationId: number, userId: number, isAdminOrOrg = false): boolean {
    const idx = this.state.registrations.findIndex(r => r.registration_id === registrationId);
    if (idx === -1) return false;

    const reg = this.state.registrations[idx];
    if (!isAdminOrOrg && reg.user_id !== userId) {
      throw new Error('Unauthorized to cancel this registration');
    }

    // Remove evaluation if any
    this.state.evaluations = this.state.evaluations.filter(ev => !(ev.event_id === reg.event_id && ev.participant_id === reg.user_id));
    this.state.registrations.splice(idx, 1);
    this.save();
    return true;
  }

  // --- Survey Sections & Questions ---
  public getSurveySectionsWithQuestions(): (SurveySection & { questions: SurveyQuestion[] })[] {
    return this.state.survey_sections
      .sort((a, b) => a.display_order - b.display_order)
      .map(sec => ({
        ...sec,
        questions: this.state.survey_questions.filter(q => q.section_id === sec.section_id),
      }));
  }

  public createSurveySection(data: { section_name: string; section_description: string; display_order?: number }): SurveySection {
    const newId = (this.state.survey_sections.length ? Math.max(...this.state.survey_sections.map(s => s.section_id)) : 0) + 1;
    const now = new Date().toISOString();
    const newSec: SurveySection = {
      section_id: newId,
      section_name: data.section_name.trim(),
      section_description: data.section_description.trim(),
      display_order: data.display_order ?? (this.state.survey_sections.length + 1),
      created_at: now,
      updated_at: now,
    };
    this.state.survey_sections.push(newSec);
    this.save();
    return newSec;
  }

  public updateSurveySection(id: number, data: Partial<SurveySection>): SurveySection {
    const sec = this.state.survey_sections.find(s => s.section_id === id);
    if (!sec) throw new Error('Section not found');
    if (data.section_name) sec.section_name = data.section_name.trim();
    if (data.section_description !== undefined) sec.section_description = data.section_description.trim();
    if (data.display_order !== undefined) sec.display_order = data.display_order;
    sec.updated_at = new Date().toISOString();
    this.save();
    return sec;
  }

  public createSurveyQuestion(data: { section_id: number; question_text: string; is_required?: boolean }): SurveyQuestion {
    const sec = this.state.survey_sections.find(s => s.section_id === data.section_id);
    if (!sec) throw new Error('Parent survey section not found');

    const newId = (this.state.survey_questions.length ? Math.max(...this.state.survey_questions.map(q => q.question_id)) : 0) + 1;
    const now = new Date().toISOString();
    const newQ: SurveyQuestion = {
      question_id: newId,
      section_id: data.section_id,
      question_text: data.question_text.trim(),
      is_required: data.is_required !== false,
      created_at: now,
      updated_at: now,
    };
    this.state.survey_questions.push(newQ);
    this.save();
    return newQ;
  }

  public updateSurveyQuestion(id: number, data: Partial<SurveyQuestion>): SurveyQuestion {
    const q = this.state.survey_questions.find(x => x.question_id === id);
    if (!q) throw new Error('Question not found');
    if (data.question_text) q.question_text = data.question_text.trim();
    if (data.is_required !== undefined) q.is_required = data.is_required;
    q.updated_at = new Date().toISOString();
    this.save();
    return q;
  }

  public deleteSurveyQuestion(id: number): boolean {
    const idx = this.state.survey_questions.findIndex(q => q.question_id === id);
    if (idx === -1) return false;
    this.state.survey_questions.splice(idx, 1);
    this.save();
    return true;
  }

  // --- Evaluations & Transactional Save ---
  public submitEvaluation(data: {
    event_id: number;
    participant_id: number;
    comments?: string | null;
    responses: { question_id: number; rating: number }[];
  }): { evaluation_id: number; message: string } {
    const evt = this.state.events.find(e => e.event_id === data.event_id);
    if (!evt) throw new Error('Event not found');

    if (!evt.is_active) {
      throw new Error('Event is not currently activated for evaluation');
    }

    // 1. Verify participant attended
    const reg = this.state.registrations.find(
      r => r.event_id === data.event_id && r.user_id === data.participant_id
    );

    if (!reg) {
      throw new Error('You are not registered for this event');
    }

    if (reg.attendance_status !== 'attended') {
      throw new Error('Only participants whose attendance has been confirmed can submit feedback');
    }

    // 2. Prevent duplicate submission
    const existingEval = this.state.evaluations.find(
      ev => ev.event_id === data.event_id && ev.participant_id === data.participant_id
    );
    if (existingEval) {
      throw new Error('You have already submitted an evaluation for this event. Duplicate submissions are prevented.');
    }

    // 3. Validate responses
    if (!data.responses || !Array.isArray(data.responses) || data.responses.length === 0) {
      throw new Error('At least one rating response is required');
    }

    for (const r of data.responses) {
      if (typeof r.rating !== 'number' || r.rating < 1 || r.rating > 5) {
        throw new Error(`Rating value must be an integer between 1 and 5 (received ${r.rating})`);
      }
      const qExists = this.state.survey_questions.some(q => q.question_id === r.question_id);
      if (!qExists) {
        throw new Error(`Survey question ID ${r.question_id} does not exist`);
      }
    }

    // Atomic Transaction: Create evaluation and all evaluation_responses
    const newEvalId = (this.state.evaluations.length ? Math.max(...this.state.evaluations.map(e => e.evaluation_id)) : 0) + 1;
    const now = new Date().toISOString();

    const evaluationRecord: Evaluation = {
      evaluation_id: newEvalId,
      event_id: data.event_id,
      participant_id: data.participant_id, // used strictly for 1-submission uniqueness
      registration_id: reg.registration_id,
      submit_date: now,
      comments: data.comments?.trim() || null,
    };

    let startResponseId = (this.state.evaluation_responses.length ? Math.max(...this.state.evaluation_responses.map(r => r.response_id)) : 0) + 1;

    const responseRecords: EvaluationResponse[] = data.responses.map(resp => ({
      response_id: startResponseId++,
      evaluation_id: newEvalId,
      question_id: resp.question_id,
      rating: Math.round(resp.rating),
    }));

    // Commit transaction
    this.state.evaluations.push(evaluationRecord);
    this.state.evaluation_responses.push(...responseRecords);
    this.save();

    return {
      evaluation_id: newEvalId,
      message: 'Evaluation submitted successfully! Thank you for your feedback.',
    };
  }

  // --- Evaluation Reports & Statistical Calculations ---
  public getEventEvaluationReport(eventId: number) {
    const evt = this.state.events.find(e => e.event_id === eventId);
    if (!evt) throw new Error('Event not found');

    const evals = this.state.evaluations.filter(e => e.event_id === eventId);
    const evalIds = evals.map(e => e.evaluation_id);
    const responses = this.state.evaluation_responses.filter(r => evalIds.includes(r.evaluation_id));

    // Interpretation scale
    const getInterpretation = (score: number): { label: string; badgeColor: string } => {
      if (score >= 4.50) return { label: 'Excellent', badgeColor: 'text-emerald-800 bg-emerald-100' };
      if (score >= 4.00) return { label: 'Very Satisfactory', badgeColor: 'text-green-800 bg-green-100' };
      if (score >= 3.00) return { label: 'Satisfactory', badgeColor: 'text-amber-800 bg-amber-100' };
      if (score >= 1.50) return { label: 'Unsatisfactory', badgeColor: 'text-orange-800 bg-orange-100' };
      return { label: 'Very Unsatisfactory', badgeColor: 'text-rose-800 bg-rose-100' };
    };

    // Calculate overall average
    const validRatings = responses.map(r => r.rating).filter(r => typeof r === 'number' && r >= 1 && r <= 5);
    const overallMean = validRatings.length > 0 ? (validRatings.reduce((a, b) => a + b, 0) / validRatings.length) : 0;
    const overallMeanFixed = Number(overallMean.toFixed(2));

    // Sections breakdown
    const sections = this.getSurveySectionsWithQuestions();
    const sectionReports = sections.map(sec => {
      const secQuestionIds = sec.questions.map(q => q.question_id);
      const secResponses = responses.filter(r => secQuestionIds.includes(r.question_id));
      const secRatings = secResponses.map(r => r.rating);
      const secMean = secRatings.length > 0 ? (secRatings.reduce((a, b) => a + b, 0) / secRatings.length) : 0;
      const secMeanFixed = Number(secMean.toFixed(2));

      const questionBreakdown = sec.questions.map(q => {
        const qResponses = responses.filter(r => r.question_id === q.question_id);
        const qRatings = qResponses.map(r => r.rating);
        const qMean = qRatings.length > 0 ? (qRatings.reduce((a, b) => a + b, 0) / qRatings.length) : 0;

        // Rating distribution counts (1 to 5)
        const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        for (const rat of qRatings) {
          if (counts[rat] !== undefined) counts[rat]++;
        }

        return {
          question_id: q.question_id,
          question_text: q.question_text,
          responses_count: qResponses.length,
          mean_score: Number(qMean.toFixed(2)),
          interpretation: qRatings.length > 0 ? getInterpretation(qMean).label : 'No Responses',
          rating_counts: counts,
        };
      });

      return {
        section_id: sec.section_id,
        section_name: sec.section_name,
        section_description: sec.section_description,
        total_responses: secResponses.length,
        mean_score: secMeanFixed,
        interpretation: secRatings.length > 0 ? getInterpretation(secMean).label : 'No Responses',
        questions: questionBreakdown,
      };
    });

    // Anonymous comments: strip participant identity completely
    const anonymousComments = evals
      .filter(e => e.comments && e.comments.trim().length > 0)
      .map(e => ({
        submit_date: e.submit_date,
        comment: e.comments!,
      }));

    const regCount = this.state.registrations.filter(r => r.event_id === eventId).length;
    const attendedCount = this.state.registrations.filter(r => r.event_id === eventId && r.attendance_status === 'attended').length;

    return {
      event_id: evt.event_id,
      event_name: evt.event_name,
      event_date: evt.event_date,
      department: evt.department,
      venue: evt.venue,
      total_registered: regCount,
      total_attended: attendedCount,
      total_evaluations: evals.length,
      response_rate_percent: attendedCount > 0 ? Number(((evals.length / attendedCount) * 100).toFixed(1)) : 0,
      overall_mean_score: overallMeanFixed,
      overall_interpretation: evals.length > 0 ? getInterpretation(overallMeanFixed).label : 'Pending Evaluation',
      sections: sectionReports,
      anonymous_comments: anonymousComments,
      generated_at: new Date().toISOString(),
    };
  }

  // --- Admin Dashboard Statistics ---
  public getAdminDashboardStats() {
    const totalEvents = this.state.events.length;
    const pendingEvents = this.state.events.filter(e => e.approval_status === 'pending').length;
    const approvedEvents = this.state.events.filter(e => e.approval_status === 'approved').length;
    const activeEvaluationEvents = this.state.events.filter(e => e.is_active === 1).length;

    const totalRegistrations = this.state.registrations.length;
    const totalAttended = this.state.registrations.filter(r => r.attendance_status === 'attended').length;
    const attendanceRate = totalRegistrations > 0 ? Number(((totalAttended / totalRegistrations) * 100).toFixed(1)) : 0;

    const totalEvaluations = this.state.evaluations.length;

    // Overall university satisfaction mean
    const allRatings = this.state.evaluation_responses.map(r => r.rating);
    const overallSatisfaction = allRatings.length > 0
      ? Number((allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(2))
      : 0;

    return {
      total_events: totalEvents,
      pending_approvals: pendingEvents,
      approved_events: approvedEvents,
      active_evaluation_events: activeEvaluationEvents,
      total_registrations: totalRegistrations,
      total_attended: totalAttended,
      attendance_rate_percent: attendanceRate,
      total_evaluations: totalEvaluations,
      overall_satisfaction_score: overallSatisfaction,
      total_students: this.state.users.filter(u => u.role === 'student').length,
      total_organizers: this.state.users.filter(u => u.role === 'organizer').length,
    };
  }

  // --- Reports ---
  public getEventsReport() {
    return this.state.events.map(e => {
      const regs = this.state.registrations.filter(r => r.event_id === e.event_id);
      const attended = regs.filter(r => r.attendance_status === 'attended').length;
      const evals = this.state.evaluations.filter(ev => ev.event_id === e.event_id);
      const evalIds = evals.map(ev => ev.evaluation_id);
      const ratings = this.state.evaluation_responses.filter(r => evalIds.includes(r.evaluation_id)).map(r => r.rating);
      const avg = ratings.length > 0 ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)) : null;

      return {
        event_id: e.event_id,
        event_name: e.event_name,
        event_date: e.event_date,
        department: e.department,
        venue: e.venue,
        capacity: e.capacity,
        approval_status: e.approval_status,
        is_active: e.is_active,
        registered_count: regs.length,
        attended_count: attended,
        evaluation_count: evals.length,
        average_rating: avg,
      };
    });
  }

  // --- SQL Export Generator ---
  public generateFullSqlDump(): string {
    const sqlParts: string[] = [
      '-- Central Mindanao University (CMU) - Event Evaluation System',
      '-- Generated MySQL Export',
      `-- Export Timestamp: ${new Date().toISOString()}`,
      '',
      'CREATE DATABASE IF NOT EXISTS event_evaluation_system;',
      'USE event_evaluation_system;',
      '',
    ];

    // Read base schema
    const schemaFile = path.resolve(process.cwd(), 'database', 'event_evaluation_system.sql');
    if (fs.existsSync(schemaFile)) {
      sqlParts.push(fs.readFileSync(schemaFile, 'utf-8'));
    }

    return sqlParts.join('\n');
  }
}

export const db = new DatabaseEngine();
