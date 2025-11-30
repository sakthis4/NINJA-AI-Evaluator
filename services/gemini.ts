import { GoogleGenAI, Type } from "@google/genai";
import { Question, EvaluationResult, QuestionEvaluation } from '../types';

const getApiKey = () => {
  // Support both process.env (from define) and import.meta.env
  return process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
};

export const evaluateExam = async (
  questions: Question[],
  answers: Record<string, string>,
  examContext: string = "Standard Technical Assessment"
): Promise<EvaluationResult> => {
  
  const apiKey = getApiKey();
  const totalMaxScore = questions.reduce((sum, q) => sum + (q.marks || 10), 0);

  if (!apiKey) {
    console.error("No API KEY found");
    return createFallbackResult(questions, totalMaxScore, "AI Evaluation Failed: No API Key provided in .env.local");
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
    You are a Senior Technical Interviewer evaluating a candidate.
    The context of the exam is: ${examContext}
    Evaluate the answers based on technical accuracy, conceptual understanding, and problem-solving approach.
    IMPORTANT INSTRUCTIONS FOR GRADING:
    1. The 'Context/Ideal Key' provided is a GUIDELINE for expected concepts, NOT a strict answer key. Do not require exact text matches.
    2. If the candidate provides a valid alternative solution or uses different wording that demonstrates correct understanding, award appropriate marks.
    3. For coding questions (Javascript/React/Python/Java/etc), focus on the logic, state management, algorithmic efficiency and syntax.
    4. For architectural/design questions, evaluate the feasibility and reasoning of their approach.
    5. Return the output strictly in JSON format.
    6. For each question, provide a score (0 to Max Marks) and brief feedback (max 2 sentences).
    7. Also provide a pass/fail status (Pass if total score > 60% of max).
  `;

  const userPromptParts = [`Here are the Question/Answer pairs:`];
  questions.forEach((q, index) => {
    const answer = answers[q.id] || "NO ANSWER PROVIDED";
    const marks = q.marks || 10;
    userPromptParts.push(
      `---`,
      `Q${index + 1} ID: ${q.id}`,
      `Question: ${q.text}`,
      `Max Marks: ${marks}`,
      `Context/Ideal Key: ${q.idealAnswerKey}`,
      `Candidate Answer: ${answer}`
    );
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPromptParts.join('\n'),
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            passFail: { type: Type.STRING, enum: ['PASS', 'FAIL'] },
            questionEvaluations: {
              type: Type.OBJECT,
              properties: questions.reduce((acc, q) => {
                acc[q.id] = {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.NUMBER },
                    feedback: { type: Type.STRING }
                  },
                  required: ['score', 'feedback']
                };
                return acc;
              }, {} as Record<string, any>)
            }
          },
          required: ['summary', 'passFail', 'questionEvaluations']
        }
      }
    });

    let jsonText = response.text || '{}';
    jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');

    const result = JSON.parse(jsonText);
    
    let totalScore = 0;
    const evaluations: Record<string, QuestionEvaluation> = {};
    
    questions.forEach(q => {
      const qEval = result.questionEvaluations?.[q.id];
      const score = typeof qEval?.score === 'number' ? qEval.score : 0;
      totalScore += score;
      evaluations[q.id] = {
        score: score,
        feedback: qEval?.feedback || "Could not evaluate"
      };
    });

    return {
      totalScore,
      maxScore: totalMaxScore,
      summary: result.summary || "Evaluation completed.",
      passFail: (result.passFail === 'PASS' || result.passFail === 'FAIL') ? result.passFail : 'FAIL',
      questionEvaluations: evaluations
    };

  } catch (error) {
    console.error("AI Evaluation Error", error);
    return createFallbackResult(questions, totalMaxScore, "Error during AI evaluation process. See console for details.");
  }
};

const createFallbackResult = (questions: Question[], maxScore: number, reason: string): EvaluationResult => {
  return {
    totalScore: 0,
    maxScore: maxScore,
    summary: reason,
    questionEvaluations: questions.reduce((acc, q) => {
      acc[q.id] = { score: 0, feedback: "Evaluation failed" };
      return acc;
    }, {} as Record<string, QuestionEvaluation>),
    passFail: 'FAIL'
  };
};

export const executeCodeWithAI = async (code: string, language: string): Promise<{type: 'output' | 'error', content: string}> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { type: 'error', content: "Execution failed: API Key not configured." };
  }
  if (!code.trim()) {
    return { type: 'output', content: "There is no code to check." };
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
    You are a Code Execution Engine. Your task is to act as a compiler/interpreter for the programming language: "${language}".
    
    1. Analyze the provided code for syntax correctness.
    2. SIMULATE the execution of the code as if it were run in a standard environment for that language.
    3. Return the Standard Output (stdout) if successful.
    4. Return the Compiler/Runtime Error message if it fails.
    
    The output must be a JSON object with two keys:
    - "type": "output" (for success/stdout) or "error" (for syntax/runtime errors).
    - "content": The actual output string or error message.

    IMPORTANT: Do NOT provide hints, fixes, or explanations. Just the raw execution output or error.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: code,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ['output', 'error'] },
            content: { type: Type.STRING }
          },
          required: ['type', 'content']
        }
      }
    });
    
    let jsonText = response.text || '{"type": "error", "content": "AI did not return a valid response."}';
    jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    const result = JSON.parse(jsonText);
    return result;

  } catch (error) {
    console.error("AI Code Execution Error", error);
    return { type: 'error', content: "An error occurred while trying to execute the code with the AI." };
  }
};