import { Candidate, ExamSubmission, ProctorLog, EvaluationResult, QuestionPaper, ExamAssignment } from '../types';
import { db as firestoreDb } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where,
  addDoc,
  deleteDoc
} from "firebase/firestore";

const COLLECTIONS = {
  CANDIDATES: 'candidates',
  SUBMISSIONS: 'submissions',
  PAPERS: 'papers',
  ASSIGNMENTS: 'assignments'
};

const LS_KEYS = {
  CANDIDATES: 'pathfinder_candidates',
  SUBMISSIONS: 'pathfinder_submissions',
  PAPERS: 'pathfinder_papers',
  ASSIGNMENTS: 'pathfinder_assignments'
};

class DatabaseService {
  private db: any;
  private initialized: boolean = false;
  private useLocalStorage: boolean = false;

  constructor() {
    this.db = firestoreDb;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    // Check if Firestore is available
    if (!this.db) {
        console.warn("Firestore client not available. Switching to LocalStorage mode.");
        this.useLocalStorage = true;
    }

    try {
        await this.seedDefaults();
        this.initialized = true;
    } catch (e) {
        console.error("Error seeding default data:", e);
        // Fallback to local storage if seeding failed due to connection error
        if (!this.useLocalStorage) {
             console.warn("Database connection failed. Fallback to LocalStorage.");
             this.useLocalStorage = true;
             try {
                await this.seedDefaults();
             } catch (lsError) {
                 console.error("LocalStorage seeding failed:", lsError);
             }
        }
        this.initialized = true;
    }
  }

  // --- Helpers for LocalStorage ---
  private getLS<T>(key: string): T[] {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch { return []; }
  }

  private setLS<T>(key: string, data: T[]) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  private async seedDefaults() {
    // 1. Seed Default Paper (Template only, no hardcoded questions)
    const defaultPaperId = 'standard-dev-eval-v1';
    
    // Check if paper exists first to avoid overwriting edits
    const existingPaper = await this.getPaper(defaultPaperId);
    
    if (!existingPaper) {
        const defaultPaper: QuestionPaper = {
            id: defaultPaperId,
            title: 'Standard Developer Evaluation',
            description: 'A comprehensive assessment covering Aptitude (10 Qs) and Technical skills (10 Qs). (Created by System)',
            questions: [], // Empty by default, forcing use of Admin UI/CSV Import
            duration: 90, // Updated to 90 minutes
            createdAt: Date.now()
        };

        if (this.useLocalStorage) {
            const papers = this.getLS<QuestionPaper>(LS_KEYS.PAPERS);
            papers.push(defaultPaper);
            this.setLS(LS_KEYS.PAPERS, papers);
        } else {
            const paperRef = doc(this.db, COLLECTIONS.PAPERS, defaultPaperId);
            await setDoc(paperRef, defaultPaper);
        }
    }

    // 2. Seed Web Application & Aptitude Evaluation
    const webPaperId = 'web-aptitude-eval-v2';
    const existingWebPaper = await this.getPaper(webPaperId);

    if (!existingWebPaper) {
        const webPaper: QuestionPaper = {
            id: webPaperId,
            title: 'Basic HTML, CSS & Aptitude Assessment v2',
            description: 'This paper evaluates foundational knowledge in HTML, CSS, and general aptitude.',
            duration: 90,
            createdAt: Date.now(),
            questions: [
                {
                    id: 'apt1',
                    section: 'Aptitude',
                    title: 'Number Series 1',
                    text: 'What comes next in the sequence: 2, 6, 12, 20, X?',
                    idealAnswerKey: '30. The differences are 4, 6, 8, 10.',
                    marks: 5
                },
                {
                    id: 'apt2',
                    section: 'Aptitude',
                    title: 'Time and Work',
                    text: 'If A can do a piece of work in 10 days and B can do the same work in 15 days, how long will they take to complete it if they work together?',
                    idealAnswerKey: '6 days.',
                    marks: 5
                },
                {
                    id: 'apt3',
                    section: 'Aptitude',
                    title: 'Ages',
                    text: 'The sum of ages of 5 children born at the intervals of 3 years each is 50 years. What is the age of the youngest child?',
                    idealAnswerKey: '4 years.',
                    marks: 5
                },
                {
                    id: 'apt4',
                    section: 'Aptitude',
                    title: 'Trains',
                    text: 'A train 125 m long passes a man, running at 5 km/hr in the same direction in which the train is going, in 10 seconds. The speed of the train is:',
                    idealAnswerKey: '50 km/hr.',
                    marks: 5
                },
                {
                    id: 'apt5',
                    section: 'Aptitude',
                    title: 'Percentages',
                    text: 'Two students appeared at an examination. One of them secured 9 marks more than the other and his marks was 56% of the sum of their marks. The marks obtained by them are:',
                    idealAnswerKey: '42 and 33.',
                    marks: 5
                },
                {
                    id: 'apt6',
                    section: 'Aptitude',
                    title: 'Profits and Loss',
                    text: 'If the cost price of 12 pens is equal to the selling price of 8 pens, the gain percent is?',
                    idealAnswerKey: '50%.',
                    marks: 5
                },
                {
                    id: 'apt7',
                    section: 'Aptitude',
                    title: 'Averages',
                    text: 'The average of 20 numbers is zero. Of them, at the most, how many may be greater than zero?',
                    idealAnswerKey: '19.',
                    marks: 5
                },
                {
                    id: 'apt8',
                    section: 'Aptitude',
                    title: 'Simple Interest',
                    text: 'A sum of money at simple interest amounts to Rs. 815 in 3 years and to Rs. 854 in 4 years. The sum is:',
                    idealAnswerKey: 'Rs. 698.',
                    marks: 5
                },
                {
                    id: 'apt9',
                    section: 'Aptitude',
                    title: 'Speed and distance',
                    text: 'A person crosses a 600 m long street in 5 minutes. What is his speed in km per hour?',
                    idealAnswerKey: '7.2 km/hr.',
                    marks: 5
                },
                {
                    id: 'apt10',
                    section: 'Aptitude',
                    title: 'Ratios',
                    text: 'A and B together have Rs. 1210. If 4/15 of A\'s amount is equal to 2/5 of B\'s amount, how much amount does B have?',
                    idealAnswerKey: 'Rs. 484.',
                    marks: 5
                },
                {
                    id: 'html1',
                    section: 'HTML',
                    title: 'Semantic HTML5',
                    text: 'Explain the difference between a <div> and a <section> in HTML5. Provide an example of when to use each.',
                    idealAnswerKey: '<div> is an unsemantic container. <section> represents a standalone thematic block of content.',
                    marks: 10
                },
                {
                    id: 'html2',
                    section: 'HTML',
                    title: 'Forms and Inputs',
                    text: 'Write the HTML code to create a simple login form containing an email input, a password input, and a submit button. The form should aim to post to `/login`.',
                    idealAnswerKey: 'Using <form action=\"/login\" method=\"POST\"> with input type email and password.',
                    codeType: 'html',
                    marks: 10
                },
                {
                    id: 'html3',
                    section: 'HTML',
                    title: 'Alt Text',
                    text: 'Why is the alt attribute important for images? What happens if it is omitted?',
                    idealAnswerKey: 'It is important for accessibility (screen readers) and when the image fails to load. If omitted, screen readers might announce the file name, which is unhelpful.',
                    marks: 10
                },
                {
                    id: 'html4',
                    section: 'HTML',
                    title: 'Tables',
                    text: 'Write the HTML code to create a simple table with two columns \"Name\" and \"Age\", and one row of data \"John\", \"30\".',
                    idealAnswerKey: '<table><tr><th>Name</th><th>Age</th></tr><tr><td>John</td><td>30</td></tr></table>',
                    codeType: 'html',
                    marks: 10
                },
                {
                    id: 'html5',
                    section: 'HTML',
                    title: 'Meta Tags',
                    text: 'What are meta tags in HTML? Provide an example of a meta tag used for responsive design.',
                    idealAnswerKey: 'Meta tags provide metadata about the HTML document. <meta name="viewport" content="width=device-width, initial-scale=1.0"> is used for responsive design.',
                    marks: 10
                },
                {
                    id: 'css1',
                    section: 'CSS',
                    title: 'CSS Specificity',
                    text: 'Explain CSS Specificity. If an element has an inline style and a conflicting CSS rule with an ID selector, which one will be applied?',
                    idealAnswerKey: 'Inline styles have higher specificity than ID selectors.',
                    marks: 10
                },
                {
                    id: 'css2',
                    section: 'CSS',
                    title: 'Flexbox Layout',
                    text: 'Write a basic CSS snippet snippet using Flexbox to perfectly center a child `div` horizontally and vertically inside a parent `div` taking up the full viewport height.',
                    idealAnswerKey: 'display: flex; justify-content: center; align-items: center; height: 100vh;',
                    codeType: 'css',
                    marks: 10
                }
            ]
        };

        if (this.useLocalStorage) {
            const papers = this.getLS<QuestionPaper>(LS_KEYS.PAPERS);
            papers.push(webPaper);
            this.setLS(LS_KEYS.PAPERS, papers);
        } else {
            const paperRef = doc(this.db, COLLECTIONS.PAPERS, webPaperId);
            await setDoc(paperRef, webPaper);
        }
    }
  }

  private async ensureAssignment(email: string, paperId: string, assignId: string) {
    if (this.useLocalStorage) {
        const assignments = this.getLS<ExamAssignment>(LS_KEYS.ASSIGNMENTS);
        const exists = assignments.find(a => a.email === email);
        if (!exists) {
            assignments.push({
                id: assignId,
                email: email,
                paperId: paperId,
                assignedBy: 'System',
                assignedAt: Date.now()
            });
            this.setLS(LS_KEYS.ASSIGNMENTS, assignments);
        }
    } else {
        const assignmentsRef = collection(this.db, COLLECTIONS.ASSIGNMENTS);
        const q = query(assignmentsRef, where('email', '==', email));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            await setDoc(doc(this.db, COLLECTIONS.ASSIGNMENTS, assignId), {
                id: assignId,
                email: email,
                paperId: paperId,
                assignedBy: 'System',
                assignedAt: Date.now()
            });
        }
    }
  }

  // --- Demo Provisioning ---
  async provisionDemoCandidate(profile: 'strong' | 'average'): Promise<Candidate> {
    const timestamp = Date.now();
    const demoId = `demo-${profile}-${timestamp}`;
    const email = `demo.${profile}.${timestamp}@example.com`;
    // Use the first available paper or the default ID
    const papers = await this.getAllPapers();
    const defaultPaperId = papers.length > 0 ? papers[0].id : 'standard-dev-eval-v1';

    const candidate: Candidate = {
        id: demoId,
        fullName: profile === 'strong' ? "Demo User (Expert)" : "Demo User (Average)",
        email: email,
        currentCompany: "Demo Inc.",
        currentSalary: "N/A",
        noticePeriod: "Immediate",
        registeredAt: timestamp,
        assignedPaperId: defaultPaperId
    };

    // 1. Ensure Assignment
    await this.ensureAssignment(email, defaultPaperId, `assign-${demoId}`);

    // 2. Register Candidate
    if (this.useLocalStorage) {
        const candidates = this.getLS<Candidate>(LS_KEYS.CANDIDATES);
        candidates.push(candidate);
        this.setLS(LS_KEYS.CANDIDATES, candidates);
    } else {
        await setDoc(doc(this.db, COLLECTIONS.CANDIDATES, candidate.id), candidate);
    }

    // 3. Generate Answers based on the ACTUAL paper questions
    const paper = await this.getPaper(defaultPaperId);
    const answers: Record<string, string> = {};
    
    if (paper && paper.questions) {
        paper.questions.forEach(q => {
            if (profile === 'strong') {
                 answers[q.id] = q.idealAnswerKey;
            } else {
                 answers[q.id] = `[Demo Answer] I believe the answer relates to... ${q.title}. Not entirely sure of the details.`;
            }
        });
    }

    // 4. Create Submission with Answers
    const submission: ExamSubmission = {
        candidateId: demoId,
        paperId: defaultPaperId,
        startTime: timestamp,
        answers: answers,
        proctorLogs: [],
        status: 'IN_PROGRESS'
    };

    if (this.useLocalStorage) {
        const submissions = this.getLS<ExamSubmission>(LS_KEYS.SUBMISSIONS);
        submissions.push(submission);
        this.setLS(LS_KEYS.SUBMISSIONS, submissions);
    } else {
        await addDoc(collection(this.db, COLLECTIONS.SUBMISSIONS), submission);
    }

    return candidate;
  }

  // --- Assignments ---

  async assignExam(email: string, paperId: string): Promise<void> {
    const trimmedEmail = email.trim().toLowerCase();
    
    if (this.useLocalStorage) {
        const assignments = this.getLS<ExamAssignment>(LS_KEYS.ASSIGNMENTS);
        const idx = assignments.findIndex(a => a.email === trimmedEmail);
        if (idx >= 0) {
            assignments[idx].paperId = paperId;
            assignments[idx].assignedAt = Date.now();
        } else {
            assignments.push({
                id: crypto.randomUUID(),
                email: trimmedEmail,
                paperId,
                assignedBy: 'Admin',
                assignedAt: Date.now()
            });
        }
        this.setLS(LS_KEYS.ASSIGNMENTS, assignments);
        return;
    }

    const assignmentsRef = collection(this.db, COLLECTIONS.ASSIGNMENTS);
    const q = query(assignmentsRef, where('email', '==', trimmedEmail));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        const docRef = snapshot.docs[0].ref;
        await updateDoc(docRef, { paperId, assignedAt: Date.now(), assignedBy: 'Admin' });
    } else {
        const newId = crypto.randomUUID();
        await setDoc(doc(this.db, COLLECTIONS.ASSIGNMENTS, newId), {
            id: newId,
            email: trimmedEmail,
            paperId,
            assignedBy: 'Admin',
            assignedAt: Date.now()
        });
    }
  }

  async getAssignment(email: string): Promise<ExamAssignment | undefined> {
    const trimmedEmail = email.trim().toLowerCase();

    if (this.useLocalStorage) {
        const assignments = this.getLS<ExamAssignment>(LS_KEYS.ASSIGNMENTS);
        return assignments.find(a => a.email === trimmedEmail);
    }

    const assignmentsRef = collection(this.db, COLLECTIONS.ASSIGNMENTS);
    const q = query(assignmentsRef, where('email', '==', trimmedEmail));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return undefined;
    return snapshot.docs[0].data() as ExamAssignment;
  }

  async getAllAssignments(): Promise<ExamAssignment[]> {
    if (this.useLocalStorage) {
        return this.getLS<ExamAssignment>(LS_KEYS.ASSIGNMENTS);
    }
    const snapshot = await getDocs(collection(this.db, COLLECTIONS.ASSIGNMENTS));
    return snapshot.docs.map(d => d.data() as ExamAssignment);
  }

  async deleteAssignment(id: string): Promise<void> {
    if (this.useLocalStorage) {
        let assignments = this.getLS<ExamAssignment>(LS_KEYS.ASSIGNMENTS);
        assignments = assignments.filter(a => a.id !== id);
        this.setLS(LS_KEYS.ASSIGNMENTS, assignments);
        return;
    }
    await deleteDoc(doc(this.db, COLLECTIONS.ASSIGNMENTS, id));
  }

  // --- Papers ---

  async createQuestionPaper(paper: QuestionPaper): Promise<void> {
    if (this.useLocalStorage) {
        const papers = this.getLS<QuestionPaper>(LS_KEYS.PAPERS);
        papers.push(paper);
        this.setLS(LS_KEYS.PAPERS, papers);
        return;
    }
    await setDoc(doc(this.db, COLLECTIONS.PAPERS, paper.id), paper);
  }

  async updateQuestionPaper(paper: QuestionPaper): Promise<void> {
    if (this.useLocalStorage) {
        const papers = this.getLS<QuestionPaper>(LS_KEYS.PAPERS);
        const idx = papers.findIndex(p => p.id === paper.id);
        if (idx >= 0) {
            papers[idx] = paper;
            this.setLS(LS_KEYS.PAPERS, papers);
        }
        return;
    }
    await setDoc(doc(this.db, COLLECTIONS.PAPERS, paper.id), paper, { merge: true });
  }

  async deleteQuestionPaper(id: string): Promise<void> {
    if (this.useLocalStorage) {
        let papers = this.getLS<QuestionPaper>(LS_KEYS.PAPERS);
        papers = papers.filter(p => p.id !== id);
        this.setLS(LS_KEYS.PAPERS, papers);
        return;
    }
    await deleteDoc(doc(this.db, COLLECTIONS.PAPERS, id));
  }

  async getAllPapers(): Promise<QuestionPaper[]> {
    if (this.useLocalStorage) {
        return this.getLS<QuestionPaper>(LS_KEYS.PAPERS);
    }
    const snapshot = await getDocs(collection(this.db, COLLECTIONS.PAPERS));
    return snapshot.docs.map(d => d.data() as QuestionPaper);
  }

  async getPaper(id: string): Promise<QuestionPaper | undefined> {
    if (this.useLocalStorage) {
        const papers = this.getLS<QuestionPaper>(LS_KEYS.PAPERS);
        return papers.find(p => p.id === id);
    }
    const docRef = doc(this.db, COLLECTIONS.PAPERS, id);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() as QuestionPaper : undefined;
  }

  // --- Candidates ---

  async registerCandidate(candidate: Candidate): Promise<{ status: 'CREATED' | 'RESUMED' | 'REJECTED', candidate?: Candidate, error?: string }> {
    const trimmedEmail = candidate.email.trim().toLowerCase();
    
    const assignment = await this.getAssignment(trimmedEmail);
    if (!assignment) {
        return { status: 'REJECTED', error: 'No exam has been assigned to this email address.' };
    }

    candidate.assignedPaperId = assignment.paperId;

    if (this.useLocalStorage) {
        const candidates = this.getLS<Candidate>(LS_KEYS.CANDIDATES);
        const existingIdx = candidates.findIndex(c => c.email === trimmedEmail);
        
        if (existingIdx >= 0) {
            const existing = candidates[existingIdx];
            // Check submission
            const sub = await this.getSubmission(existing.id);
            if (sub && (sub.status === 'SUBMITTED' || sub.status === 'GRADED')) {
                // Allow test user to always resume for demo purposes, or block standard users
                if (!trimmedEmail.startsWith('demo.')) {
                    return { status: 'REJECTED', error: 'Assessment already submitted.' };
                }
            }
            // Update
            const updated = { ...existing, ...candidate }; // merge latest info
            candidates[existingIdx] = updated;
            this.setLS(LS_KEYS.CANDIDATES, candidates);
            return { status: 'RESUMED', candidate: updated };
        } else {
            candidates.push(candidate);
            this.setLS(LS_KEYS.CANDIDATES, candidates);
            return { status: 'CREATED', candidate };
        }
    }

    // Firestore Logic
    const candidatesRef = collection(this.db, COLLECTIONS.CANDIDATES);
    const q = query(candidatesRef, where('email', '==', trimmedEmail));
    const querySnapshot = await getDocs(q);

    let existingCandidate: Candidate | null = null;
    if (!querySnapshot.empty) {
        existingCandidate = querySnapshot.docs[0].data() as Candidate;
    }

    if (existingCandidate) {
        const sub = await this.getSubmission(existingCandidate.id);
        if (sub && (sub.status === 'SUBMITTED' || sub.status === 'GRADED')) {
             if (!trimmedEmail.startsWith('demo.')) {
                 return { status: 'REJECTED', error: 'Assessment already submitted.' };
             }
        }
        const docRef = doc(this.db, COLLECTIONS.CANDIDATES, existingCandidate.id);
        const updatedData = {
            currentCompany: candidate.currentCompany,
            currentSalary: candidate.currentSalary,
            noticePeriod: candidate.noticePeriod,
            assignedPaperId: assignment.paperId
        };
        await updateDoc(docRef, updatedData);
        return { status: 'RESUMED', candidate: { ...existingCandidate, ...updatedData } };
    }

    await setDoc(doc(this.db, COLLECTIONS.CANDIDATES, candidate.id), candidate);
    return { status: 'CREATED', candidate };
  }

  async getCandidate(id: string): Promise<Candidate | undefined> {
    if (this.useLocalStorage) {
        const candidates = this.getLS<Candidate>(LS_KEYS.CANDIDATES);
        return candidates.find(c => c.id === id);
    }
    const docRef = doc(this.db, COLLECTIONS.CANDIDATES, id);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() as Candidate : undefined;
  }

  async getAllCandidates(): Promise<Candidate[]> {
    if (this.useLocalStorage) {
        return this.getLS<Candidate>(LS_KEYS.CANDIDATES);
    }
    const snapshot = await getDocs(collection(this.db, COLLECTIONS.CANDIDATES));
    return snapshot.docs.map(d => d.data() as Candidate);
  }

  async deleteCandidate(id: string): Promise<void> {
    const candidate = await this.getCandidate(id);
    
    if (this.useLocalStorage) {
        let candidates = this.getLS<Candidate>(LS_KEYS.CANDIDATES);
        candidates = candidates.filter(c => c.id !== id);
        this.setLS(LS_KEYS.CANDIDATES, candidates);
        
        let submissions = this.getLS<ExamSubmission>(LS_KEYS.SUBMISSIONS);
        submissions = submissions.filter(s => s.candidateId !== id);
        this.setLS(LS_KEYS.SUBMISSIONS, submissions);

        if (candidate) {
            let assignments = this.getLS<ExamAssignment>(LS_KEYS.ASSIGNMENTS);
            assignments = assignments.filter(a => a.email !== candidate.email);
            this.setLS(LS_KEYS.ASSIGNMENTS, assignments);
        }
        return;
    }

    try {
        // Delete candidate document
        await deleteDoc(doc(this.db, COLLECTIONS.CANDIDATES, id));
        
        // Delete submissions
        const submissionsRef = collection(this.db, COLLECTIONS.SUBMISSIONS);
        const qSub = query(submissionsRef, where('candidateId', '==', id));
        const subSnap = await getDocs(qSub);
        subSnap.forEach(async (d) => {
            await deleteDoc(d.ref);
        });

        // Delete assignment
        if (candidate) {
            const assignmentsRef = collection(this.db, COLLECTIONS.ASSIGNMENTS);
            const qAssign = query(assignmentsRef, where('email', '==', candidate.email));
            const assignSnap = await getDocs(qAssign);
            assignSnap.forEach(async (d) => {
                await deleteDoc(d.ref);
            });
        }

    } catch (e) {
        console.error("Delete failed", e);
    }
  }

  // --- Submissions ---

  async initSubmission(candidateId: string, paperId: string): Promise<ExamSubmission> {
    if (this.useLocalStorage) {
        const submissions = this.getLS<ExamSubmission>(LS_KEYS.SUBMISSIONS);
        const existing = submissions.find(s => s.candidateId === candidateId);
        if (existing) return existing;

        const newSub: ExamSubmission = {
            candidateId, paperId, startTime: Date.now(), answers: {}, proctorLogs: [], status: 'IN_PROGRESS'
        };
        submissions.push(newSub);
        this.setLS(LS_KEYS.SUBMISSIONS, submissions);
        return newSub;
    }

    const submissionsRef = collection(this.db, COLLECTIONS.SUBMISSIONS);
    const q = query(submissionsRef, where('candidateId', '==', candidateId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        return snapshot.docs[0].data() as ExamSubmission;
    }

    const newSubmission: ExamSubmission = {
        candidateId,
        paperId,
        startTime: Date.now(),
        answers: {},
        proctorLogs: [],
        status: 'IN_PROGRESS'
    };
    await addDoc(submissionsRef, newSubmission);
    return newSubmission;
  }

  async deleteSubmission(candidateId: string): Promise<void> {
    if (this.useLocalStorage) {
        let submissions = this.getLS<ExamSubmission>(LS_KEYS.SUBMISSIONS);
        submissions = submissions.filter(s => s.candidateId !== candidateId);
        this.setLS(LS_KEYS.SUBMISSIONS, submissions);
        return;
    }

    const submissionsRef = collection(this.db, COLLECTIONS.SUBMISSIONS);
    const q = query(submissionsRef, where('candidateId', '==', candidateId));
    const snapshot = await getDocs(q);
    snapshot.forEach(async (d) => {
        await deleteDoc(d.ref);
    });
  }

  async saveDraft(candidateId: string, answers: Record<string, string>, logs: ProctorLog[]): Promise<void> {
    if (this.useLocalStorage) {
        const submissions = this.getLS<ExamSubmission>(LS_KEYS.SUBMISSIONS);
        const idx = submissions.findIndex(s => s.candidateId === candidateId);
        if (idx >= 0) {
            submissions[idx].answers = answers;
            submissions[idx].proctorLogs = logs;
            this.setLS(LS_KEYS.SUBMISSIONS, submissions);
        }
        return;
    }

    const submissionsRef = collection(this.db, COLLECTIONS.SUBMISSIONS);
    const q = query(submissionsRef, where('candidateId', '==', candidateId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        const docRef = snapshot.docs[0].ref;
        await updateDoc(docRef, { answers, proctorLogs: logs });
    }
  }

  async submitExam(candidateId: string): Promise<void> {
    if (this.useLocalStorage) {
        const submissions = this.getLS<ExamSubmission>(LS_KEYS.SUBMISSIONS);
        const idx = submissions.findIndex(s => s.candidateId === candidateId);
        if (idx >= 0) {
            submissions[idx].status = 'SUBMITTED';
            submissions[idx].endTime = Date.now();
            this.setLS(LS_KEYS.SUBMISSIONS, submissions);
        }
        return;
    }

    const submissionsRef = collection(this.db, COLLECTIONS.SUBMISSIONS);
    const q = query(submissionsRef, where('candidateId', '==', candidateId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        const docRef = snapshot.docs[0].ref;
        await updateDoc(docRef, { status: 'SUBMITTED', endTime: Date.now() });
    }
  }

  async saveEvaluation(candidateId: string, result: EvaluationResult): Promise<void> {
    if (this.useLocalStorage) {
        const submissions = this.getLS<ExamSubmission>(LS_KEYS.SUBMISSIONS);
        const idx = submissions.findIndex(s => s.candidateId === candidateId);
        if (idx >= 0) {
            submissions[idx].status = 'GRADED';
            submissions[idx].aiEvaluation = result;
            this.setLS(LS_KEYS.SUBMISSIONS, submissions);
        }
        return;
    }

    const submissionsRef = collection(this.db, COLLECTIONS.SUBMISSIONS);
    const q = query(submissionsRef, where('candidateId', '==', candidateId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        const docRef = snapshot.docs[0].ref;
        await updateDoc(docRef, { aiEvaluation: result, status: 'GRADED' });
    }
  }

  async getSubmission(candidateId: string): Promise<ExamSubmission | undefined> {
    if (this.useLocalStorage) {
        const submissions = this.getLS<ExamSubmission>(LS_KEYS.SUBMISSIONS);
        return submissions.find(s => s.candidateId === candidateId);
    }
    const submissionsRef = collection(this.db, COLLECTIONS.SUBMISSIONS);
    const q = query(submissionsRef, where('candidateId', '==', candidateId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return undefined;
    return snapshot.docs[0].data() as ExamSubmission;
  }

  async getAllSubmissions(): Promise<ExamSubmission[]> {
    if (this.useLocalStorage) {
        return this.getLS<ExamSubmission>(LS_KEYS.SUBMISSIONS);
    }
    const snapshot = await getDocs(collection(this.db, COLLECTIONS.SUBMISSIONS));
    return snapshot.docs.map(d => d.data() as ExamSubmission);
  }
}

export const db = new DatabaseService();