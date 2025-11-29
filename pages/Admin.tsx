import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Candidate, ExamSubmission, EvaluationResult, QuestionPaper, Question, ExamAssignment } from '../types';
import { db } from '../services/db';
import { evaluateExam } from '../services/gemini';

declare const Prism: any; // Make Prism globally available for syntax highlighting

// Sub-component to display the ideal answer key with syntax highlighting
const IdealAnswerViewer: React.FC<{ question: Question }> = ({ question }) => {
    const { idealAnswerKey, codeType } = question;

    const highlightedHtml = useMemo(() => {
        let lang = codeType || 'javascript';
        if (lang === 'c++') lang = 'cpp';

        if (typeof Prism !== 'undefined' && codeType && codeType !== 'text' && Prism.languages[lang]) {
            return Prism.highlight(idealAnswerKey.trim(), Prism.languages[lang], lang);
        }
        return idealAnswerKey.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }, [idealAnswerKey, codeType]);

    if (codeType && codeType !== 'text') {
        return (
            <div className="bg-gray-800 text-white rounded text-xs font-mono overflow-x-auto max-h-60">
                <pre className="p-3">
                    <code className={`language-${codeType === 'c++' ? 'cpp' : codeType}`} dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
                </pre>
            </div>
        );
    }

    return <p className="whitespace-pre-wrap text-gray-700 text-xs">{idealAnswerKey}</p>;
}

type AdminTab = 'SUBMISSIONS' | 'MANAGE_EXAMS' | 'ASSIGN_EXAMS';

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('SUBMISSIONS');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Data State
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [assignments, setAssignments] = useState<ExamAssignment[]>([]);
  
  // UI State
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  
  // Exam Paper Editor State
  const [editingPaperId, setEditingPaperId] = useState<string | null>(null);
  const [paperTitle, setPaperTitle] = useState('');
  const [paperDesc, setPaperDesc] = useState('');
  const [paperDuration, setPaperDuration] = useState(60);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // Question Navigation State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1); // -1 means no question selected (or new)

  // Question Form State (Current Question being edited)
  const [qId, setQId] = useState('');
  const [qTitle, setQTitle] = useState('');
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<string>('text');
  const [qMarks, setQMarks] = useState('10');
  const [qKey, setQKey] = useState('');
  const [qSection, setQSection] = useState('Technical Assessment');

  // Assign Form State
  const [assignEmail, setAssignEmail] = useState('');
  const [assignPaperId, setAssignPaperId] = useState('');
  const [assignStatus, setAssignStatus] = useState('');

  const fetchData = async () => {
    // Fetch all data in parallel for efficiency and consistency
    const [c, p, a, s] = await Promise.all([
      db.getAllCandidates(),
      db.getAllPapers(),
      db.getAllAssignments(),
      db.getAllSubmissions()
    ]);
    
    setCandidates(c);
    setPapers(p);
    setAssignments(a);
    setSubmissions(s);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteCandidate = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete user ${name}? This action cannot be undone and will remove their assignment and submission data.`)) {
        await db.deleteCandidate(id);
        await fetchData();
    }
  };

  const handleResetSubmission = async (candidateId: string, name: string) => {
    if (window.confirm(`Are you sure you want to reset the submission for ${name}? This will delete their answers and allow them to start over. The user account will remain.`)) {
        await db.deleteSubmission(candidateId);
        await fetchData();
        // If viewing detail, close it
        if (selectedCandidateId === candidateId) setSelectedCandidateId(null);
    }
  };

  const handleDeletePaper = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete the exam paper "${title}"? This action cannot be undone.`)) {
        await db.deleteQuestionPaper(id);
        
        // If we are currently editing this paper, reset the editor
        if (editingPaperId === id) {
            initPaperEditor();
        }
        await fetchData();
    }
  };
  
  const handleDeleteAssignment = async (id: string, email: string) => {
    if (window.confirm(`Are you sure you want to delete the assignment for ${email}?`)) {
        await db.deleteAssignment(id);
        await fetchData();
    }
  };

  const handleExportPaper = (paper: QuestionPaper) => {
    let csvContent = "data:text/csv;charset=utf-8,Section,Title,QuestionText,IdealAnswer,Type,Marks\n";
    
    paper.questions.forEach(q => {
        // Escape quotes by doubling them, wrap fields in quotes
        const safe = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
        const row = [
            safe(q.section),
            safe(q.title),
            safe(q.text),
            safe(q.idealAnswerKey),
            safe(q.codeType || 'text'),
            q.marks || 10
        ].join(",");
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${paper.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEvaluate = async (submission: ExamSubmission) => {
    setEvaluatingId(submission.candidateId);
    try {
      // Need to fetch the specific paper to know question details (marks, keys)
      const paper = await db.getPaper(submission.paperId);
      if (paper) {
        const result = await evaluateExam(paper.questions, submission.answers);
        await db.saveEvaluation(submission.candidateId, result);
        await fetchData();
      } else {
        alert("Original question paper for this submission not found.");
      }
    } catch (e) {
      console.error("Evaluation failed", e);
    } finally {
      setEvaluatingId(null);
    }
  };

  // --- CSV Import Logic ---

  const handleDownloadTemplate = () => {
    // Create a CSV template with 20 rows: 10 Aptitude + 10 Technical
    let csvContent = "data:text/csv;charset=utf-8,Section,Title,QuestionText,IdealAnswer,Type(text/python/javascript/java/cpp),Marks\n";
    
    // First 10: Aptitude
    for (let i = 1; i <= 10; i++) {
        csvContent += `Aptitude & Reasoning,Aptitude Q${i},Enter question text here...,Enter answer key...,text,5\n`;
    }
    // Next 10: Technical
    for (let i = 1; i <= 10; i++) {
        csvContent += `Technical Assessment,Technical Q${i},Enter question text here...,Enter answer key...,text,10\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "exam_template_20q.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text) return;

        try {
            const rows = text.split('\n');
            const newQuestions: Question[] = [];
            
            // Skip header (index 0) and filter empty lines
            const dataRows = rows.slice(1).filter(r => r.trim() !== '');

            dataRows.forEach((row, index) => {
                // Regex to split by comma ONLY if not inside quotes
                const cols = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || row.split(',');
                
                // Clean up quotes
                const clean = (str: string) => str ? str.replace(/^"|"$/g, '').replace(/""/g, '"').trim() : '';

                let section = clean(cols[0]);
                const title = clean(cols[1]) || `Question ${index + 1}`;
                const qText = clean(cols[2]);
                const idealAnswer = clean(cols[3]);
                let type = clean(cols[4]).toLowerCase() || 'text';
                const marks = parseInt(clean(cols[5])) || 5;

                // Enforce the 10/10 Pattern if not explicitly strict in CSV
                if (index < 10 && !section) {
                    section = "Aptitude & Reasoning";
                    if (type !== 'text') type = 'text'; 
                } else if (index < 20 && !section) {
                    section = "Technical Assessment";
                } else if (!section) {
                    section = "Technical Assessment";
                }

                if (qText) {
                    newQuestions.push({
                        id: `q-csv-${Date.now()}-${index}`,
                        section: section,
                        title: title,
                        text: qText,
                        idealAnswerKey: idealAnswer,
                        codeType: type,
                        marks: marks
                    });
                }
            });

            if (newQuestions.length > 0) {
                setQuestions(newQuestions);
                alert(`Successfully imported ${newQuestions.length} questions.\n\nStructure:\n- ${newQuestions.filter(q => q.section === 'Aptitude & Reasoning').length} Aptitude\n- ${newQuestions.filter(q => q.section === 'Technical Assessment').length} Technical`);
                
                // Set index to 0 to start editing
                if (newQuestions.length > 0) setCurrentQuestionIndex(0);
                
                // Clear the file input
                if (fileInputRef.current) fileInputRef.current.value = '';
            } else {
                alert("No valid questions found in CSV.");
            }
        } catch (err) {
            console.error("CSV Parse Error", err);
            alert("Failed to parse CSV. Please ensure it matches the template format.");
        }
    };
    reader.readAsText(file);
  };

  // --- Paper Editor Logic ---

  const initPaperEditor = (paper?: QuestionPaper) => {
    if (paper) {
        setEditingPaperId(paper.id);
        setPaperTitle(paper.title);
        setPaperDesc(paper.description);
        setPaperDuration(paper.duration || 60);
        setQuestions([...paper.questions]);
        if (paper.questions.length > 0) {
            loadQuestionIntoForm(paper.questions[0], 0);
        } else {
            setCurrentQuestionIndex(-1); // New Q state
            clearQuestionForm();
        }
    } else {
        setEditingPaperId(null);
        setPaperTitle('');
        setPaperDesc('');
        setPaperDuration(60);
        setQuestions([]);
        setCurrentQuestionIndex(-1);
        clearQuestionForm();
    }
  };

  const clearQuestionForm = () => {
    setQId(`q-${Date.now()}`);
    setQTitle(''); setQText(''); setQKey(''); setQType('text'); setQMarks('10');
    setQSection('Technical Assessment');
  };

  const loadQuestionIntoForm = (q: Question, index: number) => {
    setCurrentQuestionIndex(index);
    setQId(q.id);
    setQTitle(q.title);
    setQText(q.text);
    setQType(q.codeType || 'text');
    setQMarks(String(q.marks || 10));
    setQKey(q.idealAnswerKey);
    setQSection(q.section);
  };

  // Saves the CURRENT form data into the questions array at the current index
  const commitCurrentQuestion = () => {
      // Validate
      if (!qTitle.trim() || !qText.trim()) return false;

      const newQ: Question = {
          id: qId,
          section: qSection,
          title: qTitle,
          text: qText,
          codeType: qType,
          marks: parseInt(qMarks) || 10,
          idealAnswerKey: qKey
      };

      const updatedQuestions = [...questions];
      
      if (currentQuestionIndex === -1 || currentQuestionIndex >= questions.length) {
          // It's a new question
          updatedQuestions.push(newQ);
          setQuestions(updatedQuestions);
          setCurrentQuestionIndex(updatedQuestions.length - 1); // Move to this new index
      } else {
          // Update existing
          updatedQuestions[currentQuestionIndex] = newQ;
          setQuestions(updatedQuestions);
      }
      return true;
  };

  const handleNextQuestion = () => {
      if (!commitCurrentQuestion()) {
          alert("Please fill in the title and text before proceeding.");
          return;
      }
      
      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex < questions.length) {
          loadQuestionIntoForm(questions[nextIndex], nextIndex);
      } else {
          // Move to "Add New" state
          setCurrentQuestionIndex(-1);
          clearQuestionForm();
      }
  };

  const handlePrevQuestion = () => {
      commitCurrentQuestion(); // Save progress on current
      const prevIndex = currentQuestionIndex === -1 ? questions.length - 1 : currentQuestionIndex - 1;
      if (prevIndex >= 0) {
          loadQuestionIntoForm(questions[prevIndex], prevIndex);
      }
  };

  const handleJumpToQuestion = (index: number) => {
      commitCurrentQuestion();
      if (index >= 0 && index < questions.length) {
          loadQuestionIntoForm(questions[index], index);
      }
  };
  
  const handleAddNewQuestion = () => {
      commitCurrentQuestion();
      setCurrentQuestionIndex(-1);
      clearQuestionForm();
  };

  const handleRemoveCurrentQuestion = () => {
      if (currentQuestionIndex >= 0 && currentQuestionIndex < questions.length) {
          const newQs = questions.filter((_, i) => i !== currentQuestionIndex);
          setQuestions(newQs);
          
          if (newQs.length > 0) {
              const newIndex = Math.min(currentQuestionIndex, newQs.length - 1);
              loadQuestionIntoForm(newQs[newIndex], newIndex);
          } else {
              setCurrentQuestionIndex(-1);
              clearQuestionForm();
          }
      }
  };

  const handleSavePaper = async () => {
    // Commit any unsaved changes in the form
    if (qTitle.trim() && qText.trim()) {
        commitCurrentQuestion();
    }
    
    // Slight delay to ensure state update if commit happened
    await new Promise(r => setTimeout(r, 100));
    
    // We can't rely on 'questions' state immediately if we just called setQuestions.
    // However, in React batching, it might be okay. To be safe, re-read form if valid.
    
    // Re-verify length
    if (!paperTitle) {
        alert("Please provide a paper title.");
        return;
    }
    
    // Construct final object
    // Note: Use current state 'questions'. If user just typed in form but didn't click "Next" or "Add", 
    // the very last edit might be pending.
    // To solve this, let's explicitly push the current form if it looks valid and isn't saved.
    let finalQuestions = [...questions];
    
    // If the form has valid data and we are in "New" mode (-1), add it.
    // If we are in Edit mode, update it.
    if (qTitle.trim() && qText.trim()) {
        const currentFormQ: Question = {
            id: qId, section: qSection, title: qTitle, text: qText, codeType: qType, marks: parseInt(qMarks) || 10, idealAnswerKey: qKey
        };
        if (currentQuestionIndex === -1) {
             // Check if this exact ID is already in (unlikely due to timestamp)
             finalQuestions.push(currentFormQ);
        } else {
             finalQuestions[currentQuestionIndex] = currentFormQ;
        }
    }
    
    if (finalQuestions.length === 0) {
        alert("Please add at least one question.");
        return;
    }

    const paper: QuestionPaper = {
      id: editingPaperId || `paper-${Date.now()}`,
      title: paperTitle,
      description: paperDesc,
      questions: finalQuestions,
      duration: paperDuration,
      createdAt: editingPaperId ? (papers.find(p => p.id === editingPaperId)?.createdAt || Date.now()) : Date.now()
    };

    if (editingPaperId) {
        await db.updateQuestionPaper(paper);
    } else {
        await db.createQuestionPaper(paper);
    }
    
    alert("Exam Paper Saved!");
    initPaperEditor(undefined); // Reset
    fetchData();
  };

  const handleAssign = async () => {
    if (!assignEmail || !assignPaperId) return;
    await db.assignExam(assignEmail, assignPaperId);
    setAssignStatus(`Assigned to ${assignEmail}`);
    setAssignEmail('');
    fetchData();
    setTimeout(() => setAssignStatus(''), 3000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS': return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">In Progress</span>;
      case 'SUBMITTED': return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">Submitted</span>;
      case 'GRADED': return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Graded</span>;
      default: return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">Not Started</span>;
    }
  };

  // --- Subcomponents for Cleanliness ---

  const renderManageExams = () => (
    <div className="grid md:grid-cols-4 gap-6">
        {/* Left Col: List of Papers */}
        <div className="md:col-span-1 bg-white rounded-lg shadow p-4 h-fit max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Exam Papers</h3>
                <button 
                    onClick={() => initPaperEditor()} 
                    className="text-xs bg-brand-600 text-white px-2 py-1 rounded hover:bg-brand-700"
                >
                    + New
                </button>
            </div>
            <ul className="space-y-2">
                {papers.map(p => (
                    <li key={p.id} className={`p-3 rounded border cursor-pointer transition-colors ${editingPaperId === p.id ? 'bg-brand-50 border-brand-500' : 'bg-gray-50 hover:bg-gray-100'}`}>
                        <div className="flex flex-col gap-2">
                            <div onClick={() => initPaperEditor(p)}>
                                <div className="font-medium text-sm">{p.title}</div>
                                <div className="text-xs text-gray-500">{p.questions.length} Qs • {p.duration || 60} mins</div>
                            </div>
                            <div className="flex gap-2 self-end">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleExportPaper(p); }} 
                                    className="text-gray-600 hover:text-gray-800 text-xs font-medium border border-gray-300 px-2 rounded bg-white"
                                >
                                    Export
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeletePaper(p.id, p.title); }}
                                    className="text-red-600 hover:text-red-800 text-xs font-medium"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>

        {/* Right Col: Editor */}
        <div className="md:col-span-3 bg-white rounded-lg shadow p-6 flex flex-col h-full">
            <h3 className="text-xl font-bold mb-6 flex justify-between items-center">
                <span>{editingPaperId ? 'Edit Exam Paper' : 'Create New Exam Paper'}</span>
                <button onClick={handleSavePaper} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-bold text-sm">
                    {editingPaperId ? 'Save All Changes' : 'Create Paper'}
                </button>
            </h3>
            
            {/* Paper Meta Data */}
            <div className="grid md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded border">
                <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Paper Title</label>
                    <input className="w-full border rounded p-2 text-sm" value={paperTitle} onChange={e => setPaperTitle(e.target.value)} placeholder="e.g. Senior Dev Assessment" />
                </div>
                <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
                    <input className="w-full border rounded p-2 text-sm" value={paperDesc} onChange={e => setPaperDesc(e.target.value)} placeholder="Assessment Context..." />
                </div>
                <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Duration (mins)</label>
                    <input type="number" className="w-full border rounded p-2 text-sm" value={paperDuration} onChange={e => setPaperDuration(parseInt(e.target.value) || 60)} />
                </div>
            </div>

            {/* CSV Import */}
            <div className="mb-6 p-3 bg-blue-50 border border-blue-100 rounded-md flex justify-between items-center">
                <div>
                    <h4 className="font-bold text-xs text-blue-800">Bulk Import Questions</h4>
                    <p className="text-[10px] text-blue-600">Import CSV to auto-fill questions.</p>
                </div>
                <div className="flex gap-2 items-center">
                    <button onClick={handleDownloadTemplate} className="text-xs bg-white border border-blue-300 text-blue-700 px-3 py-1 rounded">Template</button>
                    <label className="text-xs bg-blue-600 text-white px-3 py-1 rounded cursor-pointer hover:bg-blue-700 flex items-center gap-1">
                        <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCSV} className="hidden" />
                        Upload CSV
                    </label>
                </div>
            </div>

            {/* Question Editor Area */}
            <div className="border rounded-lg flex-1 flex flex-col overflow-hidden">
                {/* Editor Header / Navigation */}
                <div className="bg-gray-100 p-3 border-b flex justify-between items-center">
                    <div className="flex items-center gap-3">
                         <span className="font-bold text-gray-700">
                            {currentQuestionIndex === -1 ? 'New Question' : `Question ${currentQuestionIndex + 1} of ${questions.length}`}
                         </span>
                         
                         {questions.length > 0 && (
                            <select 
                                className="text-xs border rounded p-1 max-w-[150px]" 
                                value={currentQuestionIndex} 
                                onChange={(e) => handleJumpToQuestion(parseInt(e.target.value))}
                            >
                                <option value={-1}>-- New Question --</option>
                                {questions.map((q, i) => (
                                    <option key={i} value={i}>{i + 1}. {q.title.substring(0, 20)}...</option>
                                ))}
                            </select>
                         )}
                    </div>
                    
                    <div className="flex gap-2">
                         <button 
                            onClick={handlePrevQuestion}
                            disabled={currentQuestionIndex <= 0 && currentQuestionIndex !== -1} // Disable prev if at 0
                            className="text-xs px-3 py-1 rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
                         >
                            &larr; Previous
                         </button>
                         <button 
                             onClick={handleNextQuestion}
                             className="text-xs px-3 py-1 rounded bg-brand-600 text-white hover:bg-brand-700"
                         >
                            {currentQuestionIndex === -1 || currentQuestionIndex === questions.length - 1 ? 'Add & Next' : 'Next &rarr;'}
                         </button>
                    </div>
                </div>

                {/* The Form */}
                <div className="p-6 overflow-y-auto flex-1 bg-white">
                    <div className="space-y-4 max-w-3xl mx-auto">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Section</label>
                                <select className="w-full border rounded p-2 text-sm" value={qSection} onChange={(e) => setQSection(e.target.value)}>
                                    <option value="Aptitude & Reasoning">Aptitude & Reasoning</option>
                                    <option value="Technical Assessment">Technical Assessment</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Question Title</label>
                                <input className="w-full border rounded p-2 text-sm font-medium" value={qTitle} onChange={e => setQTitle(e.target.value)} placeholder="Short title (e.g. Python List)" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Question Text</label>
                            <textarea className="w-full border rounded p-2 text-sm h-24" value={qText} onChange={e => setQText(e.target.value)} placeholder="Full question description..." />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type / Language</label>
                                <select className="w-full border rounded p-2 text-sm" value={qType} onChange={(e) => setQType(e.target.value)}>
                                    <option value="text">Text / Descriptive</option>
                                    <option value="javascript">JavaScript</option>
                                    <option value="python">Python</option>
                                    <option value="java">Java</option>
                                    <option value="c">C</option>
                                    <option value="cpp">C++</option>
                                    <option value="csharp">C#</option>
                                    <option value="go">Go</option>
                                    <option value="sql">SQL</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Marks</label>
                                <input type="number" className="w-full border rounded p-2 text-sm" value={qMarks} onChange={e => setQMarks(e.target.value)} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ideal Answer / Evaluation Criteria</label>
                            <textarea className="w-full border rounded p-2 text-sm h-24 font-mono bg-gray-50" value={qKey} onChange={e => setQKey(e.target.value)} placeholder="Correct answer or code..." />
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="bg-gray-50 p-3 border-t flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                        {currentQuestionIndex === -1 ? 'Adding New Question' : `Editing Question ID: ${qId}`}
                    </div>
                    {currentQuestionIndex !== -1 && (
                        <div className="flex gap-2">
                             <button onClick={handleAddNewQuestion} className="text-brand-600 hover:text-brand-800 text-xs font-bold px-3 py-1 border border-brand-200 rounded bg-white">
                                + Add Another
                             </button>
                             <button onClick={handleRemoveCurrentQuestion} className="text-red-600 hover:text-red-800 text-xs px-3 py-1">
                                Delete Question
                             </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );

  const renderAssign = () => (
    <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <h3 className="text-xl font-bold mb-6">Assign Exam to Candidate</h3>
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-1">Candidate Email</label>
                <input 
                    type="email" 
                    className="w-full border rounded p-2" 
                    placeholder="candidate@example.com"
                    value={assignEmail}
                    onChange={e => setAssignEmail(e.target.value)} 
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Select Question Paper</label>
                <select 
                    className="w-full border rounded p-2"
                    value={assignPaperId}
                    onChange={e => setAssignPaperId(e.target.value)}
                >
                    <option value="">-- Select Exam --</option>
                    {papers.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                </select>
            </div>
            <button onClick={handleAssign} className="bg-brand-600 text-white px-6 py-2 rounded hover:bg-brand-700 font-bold w-full">
                Assign Exam
            </button>
            {assignStatus && <p className="text-green-600 text-center font-medium mt-2">{assignStatus}</p>}
        </div>

        <div className="mt-10 border-t pt-6">
            <h4 className="font-bold mb-4">Current Assignments</h4>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 text-left">
                            <th className="p-2">Email</th>
                            <th className="p-2">Paper ID</th>
                            <th className="p-2">Assigned At</th>
                            <th className="p-2">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assignments.map(a => (
                            <tr key={a.id} className="border-t">
                                <td className="p-2">{a.email}</td>
                                <td className="p-2">{a.paperId}</td>
                                <td className="p-2">{new Date(a.assignedAt).toLocaleDateString()}</td>
                                <td className="p-2">
                                    <button 
                                        onClick={() => handleDeleteAssignment(a.id, a.email)}
                                        className="text-red-600 hover:text-red-800 text-xs font-bold"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );

  // Detail View (Submissions)
  if (selectedCandidateId && activeTab === 'SUBMISSIONS') {
    const candidate = candidates.find(c => c.id === selectedCandidateId);
    const submission = submissions.find(s => s.candidateId === selectedCandidateId);
    // Find paper info to verify questions title in detail view
    const paper = papers.find(p => p.id === submission?.paperId);
    // Fallback to paper questions or empty if not found
    const questionsToDisplay = paper?.questions || [];

    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedCandidateId(null)} className="text-brand-600 hover:underline mb-4">&larr; Back to Dashboard</button>
        
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <div className="border-b pb-4 flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-bold">{candidate?.fullName}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm text-gray-600">
                    <div>Email: {candidate?.email}</div>
                    <div>Paper: {paper?.title || submission?.paperId || 'Unknown'}</div>
                    <div>Salary: {candidate?.currentSalary}</div>
                    <div>Notice: {candidate?.noticePeriod}</div>
                </div>
            </div>
            <button 
                onClick={() => candidate && handleResetSubmission(candidate.id, candidate.fullName)}
                className="text-red-600 hover:text-red-800 text-sm border border-red-200 bg-red-50 px-3 py-1 rounded"
            >
                Reset Submission
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-red-50 p-4 rounded border border-red-200">
                <h3 className="font-bold text-red-800 mb-2">Proctoring Logs ({submission?.proctorLogs.length || 0})</h3>
                <div className="h-40 overflow-y-auto text-xs space-y-1">
                    {submission?.proctorLogs.map((log, i) => (
                        <div key={i} className="text-red-700">
                            [{new Date(log.timestamp).toLocaleTimeString()}] {log.type} {log.details ? `- ${log.details}` : ''}
                        </div>
                    ))}
                    {(!submission?.proctorLogs || submission.proctorLogs.length === 0) && <span className="text-gray-500">No violations detected.</span>}
                </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded border border-green-200">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-green-800">AI Assessment</h3>
                    {submission?.aiEvaluation && (
                        <button 
                            onClick={() => submission && handleEvaluate(submission)}
                            disabled={!!evaluatingId}
                            className="text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 border border-green-300 px-2 py-1 rounded transition-colors disabled:opacity-50"
                        >
                            {evaluatingId === selectedCandidateId ? 'Processing...' : 'Re-evaluate'}
                        </button>
                    )}
                </div>

                {submission?.aiEvaluation ? (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-lg font-bold">
                            <span>Score: {submission.aiEvaluation.totalScore} / {submission.aiEvaluation.maxScore}</span>
                            <span className={submission.aiEvaluation.passFail === 'PASS' ? 'text-green-600' : 'text-red-600'}>
                                {submission.aiEvaluation.passFail}
                            </span>
                        </div>
                        <p className="text-sm text-gray-700 italic">{submission.aiEvaluation.summary}</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-32">
                        <p className="text-gray-500 mb-2">Not graded yet</p>
                        <button 
                            onClick={() => submission && handleEvaluate(submission)}
                            disabled={!!evaluatingId}
                            className="bg-brand-600 text-white px-3 py-1 rounded text-sm disabled:bg-gray-400"
                        >
                            {evaluatingId === selectedCandidateId ? 'Grading...' : 'Run AI Grading'}
                        </button>
                    </div>
                )}
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-xl font-bold mb-4">Detailed Answers</h3>
            <div className="space-y-6">
                {questionsToDisplay.length === 0 && <p className="text-gray-500">No question data available (Paper ID might be missing).</p>}
                {questionsToDisplay.map(q => {
                    const ans = submission?.answers[q.id];
                    const evalData = submission?.aiEvaluation?.questionEvaluations[q.id];
                    return (
                        <div key={q.id} className="border p-4 rounded bg-gray-50">
                            <div className="flex justify-between mb-2">
                                <h4 className="font-bold text-gray-900">{q.title} <span className="text-xs font-normal text-gray-500">({q.marks || 10} marks)</span></h4>
                                {evalData && (
                                    <span className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded font-mono">
                                        Score: {evalData.score}/{q.marks || 10}
                                    </span>
                                )}
                            </div>
                            <div className="mb-2">
                                <span className="text-xs font-semibold text-gray-500 uppercase">Candidate Answer:</span>
                                <div className="text-sm text-gray-800 whitespace-pre-wrap mt-1 p-2 bg-white border rounded font-mono">
                                    {ans || <span className="text-gray-400 italic">No answer provided</span>}
                                </div>
                            </div>

                            <details className="mt-2">
                                <summary className="text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-800 select-none">
                                    Show Ideal Answer Key
                                </summary>
                                <div className="mt-2 p-2 bg-gray-100 border rounded">
                                    <IdealAnswerViewer question={q} />
                                </div>
                            </details>
                            
                            {evalData && (
                                <div className="mt-4">
                                    <span className="text-xs font-semibold text-purple-600 uppercase">AI Feedback:</span>
                                    <p className="text-sm text-gray-600 mt-1">{evalData.feedback}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List View (Submissions)
  const renderSubmissions = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-bold">Candidate Submissions</h2>
        <button onClick={fetchData} className="text-sm text-brand-600 hover:text-brand-800">Refresh Data</button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {candidates.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No candidates found.</td></tr>
            )}
            {candidates.map(candidate => {
              const sub = submissions.find(s => s.candidateId === candidate.id);
              return (
                <tr key={candidate.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{candidate.fullName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{candidate.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(sub?.status || 'NOT_STARTED')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sub?.aiEvaluation ? `${sub.aiEvaluation.totalScore} / ${sub.aiEvaluation.maxScore}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                        onClick={() => setSelectedCandidateId(candidate.id)}
                        className="text-brand-600 hover:text-brand-900 mr-3"
                    >
                        View
                    </button>
                    <button 
                        onClick={() => handleResetSubmission(candidate.id, candidate.fullName)}
                        className="text-orange-600 hover:text-orange-900 mr-3"
                    >
                        Reset
                    </button>
                    <button 
                        onClick={() => handleDeleteCandidate(candidate.id, candidate.fullName)}
                        className="text-red-600 hover:text-red-900"
                    >
                        Delete User
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
        <div className="mb-6 flex gap-4 border-b">
            <button 
                className={`pb-2 px-4 font-medium ${activeTab === 'SUBMISSIONS' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('SUBMISSIONS')}
            >
                Submissions
            </button>
            <button 
                className={`pb-2 px-4 font-medium ${activeTab === 'MANAGE_EXAMS' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('MANAGE_EXAMS')}
            >
                Manage Exams
            </button>
            <button 
                className={`pb-2 px-4 font-medium ${activeTab === 'ASSIGN_EXAMS' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('ASSIGN_EXAMS')}
            >
                Assign Exams
            </button>
        </div>

        {activeTab === 'SUBMISSIONS' && renderSubmissions()}
        {activeTab === 'MANAGE_EXAMS' && renderManageExams()}
        {activeTab === 'ASSIGN_EXAMS' && renderAssign()}
    </div>
  );
};

export default Admin;