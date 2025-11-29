import { Candidate, ExamSubmission, ProctorLog, EvaluationResult, QuestionPaper, ExamAssignment } from '../types';
import { QUESTIONS } from '../constants';
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
    // 1. Seed Default Paper
    const defaultPaperId = 'comprehensive-dev-v1';
    const defaultPaper: QuestionPaper = {
        id: defaultPaperId,
        title: 'Comprehensive Developer Assessment',
        description: 'A structured two-module assessment covering aptitude and technical skills (Python, DL, Git, React, AWS).',
        questions: QUESTIONS.map(q => ({ ...q, marks: q.marks || 10 })),
        duration: 90,
        createdAt: Date.now()
    };

    if (this.useLocalStorage) {
        const papers = this.getLS<QuestionPaper>(LS_KEYS.PAPERS);
        // Upsert logic for LS
        const idx = papers.findIndex(p => p.id === defaultPaperId);
        if (idx >= 0) {
            papers[idx] = defaultPaper;
        } else {
            papers.push(defaultPaper);
        }
        this.setLS(LS_KEYS.PAPERS, papers);
    } else {
        const paperRef = doc(this.db, COLLECTIONS.PAPERS, defaultPaperId);
        await setDoc(paperRef, defaultPaper, { merge: true });
    }

    // 2. Seed Default Assignments
    await this.ensureAssignment('alex.tester@example.com', defaultPaperId, 'assign-default-comp-dev-1');
    await this.ensureAssignment('srihariprasath44@gmail.com', defaultPaperId, 'assign-srihari-comp-dev-1');
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
    const defaultPaperId = 'comprehensive-dev-v1';

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

    // 3. Generate Answers
    const answers: Record<string, string> = {};
    QUESTIONS.forEach(q => {
        if (profile === 'strong') {
             answers[q.id] = q.idealAnswerKey;
        } else {
             // Simulates a shorter, less perfect answer
             answers[q.id] = `[Demo Answer] I believe the concept involves... ${q.title.toLowerCase()}. However, I am not fully sure of the exact syntax.`;
        }
    });

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