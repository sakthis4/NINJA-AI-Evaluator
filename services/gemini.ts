
import { GoogleGenAI, Type } from "@google/genai";
import { Question, EvaluationResult, QuestionEvaluation } from '../types';

// Evaluation service for grading exam submissions using Gemini 3 Pro
export const evaluateExam = async (
  questions: Question[],
  answers: Record<string, string>,
  examContext: string = "Standard Technical Assessment"
): Promise<EvaluationResult> => {
  
  const totalMaxScore = questions.reduce((sum, q) => sum + (q.marks || 10), 0);

  // Fix: Directly use process.env.API_KEY as required by the latest SDK guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemInstruction = `
    You are a Senior Technical Interviewer evaluating a candidate.
    The context of the exam is: ${examContext}
    Evaluate the answers based on technical accuracy, conceptual understanding, and problem-solving approach.
    IMPORTANT INSTRUCTIONS FOR GRADING:
    1. The 'Context/Ideal Key' provided is a GUIDELINE for expected concepts, NOT a strict answer key. Do not require exact text matches.
    2. EXTREMELY LENIENT NATURAL LANGUAGE PROCESSING: Candidates may write answers in very informal or conversational English, use sentence fragments, or explain it in their own words completely avoiding textbook terminology. They may have typos, poor grammar, or unstructured thoughts.
       Your primary goal is to EXTRACT SEMANTIC MEANING. If the candidate's answer broadly hits the fundamental concept or shows they understand the core logic, you MUST award full or partial marks. Never penalize for brevity or grammatical incorrectness.
    3. If the candidate provides a valid alternative solution or uses different wording that demonstrates correct understanding, award appropriate marks. Do not expect or require a "clean" or perfectly formatted answer. Wait for the intent of the candidate before grading.
    4. For coding questions (Javascript/React/Python/Java/etc), focus on the logic, state management, algorithmic efficiency and syntax. Allow for pseudocode or descriptive logic if the question doesn't strictly demand executable code. Focus on their thought process.
    5. For architectural/design questions, evaluate the feasibility and reasoning of their approach. Open ended answers are fine.
    6. Return the output strictly in JSON format.
    7. For each question, provide a score (0 to Max Marks) and brief feedback (max 2 sentences).
    8. Also provide a pass/fail status (Pass if total score > 40% of max score).
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
    // Fix: Use gemini-3.1-pro-preview for complex reasoning and include a thinking budget
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
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

    // Fix: access response.text directly as a property, not a function
    const jsonText = response.text || '{}';
    let result: any = {};
    try {
      const cleanJsonText = jsonText.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();
      result = JSON.parse(cleanJsonText);
    } catch (e) {
      console.error("Error parsing Gemini response:", e, jsonText);
      throw new Error("Invalid formulation of AI JSON response.");
    }
    
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

// Simulation of code execution using Gemini 3 Pro's reasoning capabilities
export const executeCodeWithAI = async (code: string, language: string): Promise<{type: 'output' | 'error', content: string}> => {
  if (!code.trim()) {
    return { type: 'output', content: "There is no code to check." };
  }

  // Fix: Initialize client with process.env.API_KEY directly
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    // Fix: Use gemini-3.1-pro-preview for simulation tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
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
    
    // Fix: access response.text directly as a property
    const jsonText = response.text || '{"type": "error", "content": "AI did not return a valid response."}';
    let result;
    try {
      const cleanJsonText = jsonText.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();
      result = JSON.parse(cleanJsonText);
    } catch (e) {
      console.error("Error parsing Gemini execution response:", e, jsonText);
      result = { type: 'error', content: "Invalid JSON response from AI." };
    }
    return result;

  } catch (error) {
    console.error("AI Code Execution Error", error);
    return { type: 'error', content: "An error occurred while trying to execute the code with the AI." };
  }
};
