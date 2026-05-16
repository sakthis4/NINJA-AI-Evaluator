
import { Question, EvaluationResult } from '../types';

// Evaluation service for grading exam submissions using our backend API
export const evaluateExam = async (
  questions: Question[],
  answers: Record<string, string>,
  examContext: string = "Standard Technical Assessment"
): Promise<EvaluationResult> => {
  const totalMaxScore = questions.reduce((sum, q) => sum + (q.marks || 10), 0);
  try {
    const response = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions, answers, examContext })
    });

    if (!response.ok) {
      throw new Error(`Evaluation failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }
    return data as EvaluationResult;
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
    }, {} as Record<string, any>),
    passFail: 'FAIL'
  };
};

// Simulation of code execution using our backend API
export const executeCodeWithAI = async (code: string, language: string): Promise<{type: 'output' | 'error', content: string}> => {
  if (!code.trim()) {
    return { type: 'output', content: "There is no code to check." };
  }

  try {
    const response = await fetch('/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language })
    });

    if (!response.ok) {
      throw new Error(`Execution failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }
    return data;
  } catch (error) {
    console.error("AI Code Execution Error", error);
    return { type: 'error', content: "An error occurred while trying to execute the code with the AI." };
  }
};
