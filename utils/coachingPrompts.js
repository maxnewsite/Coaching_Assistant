// utils/coachingPrompts.js

/**
 * Question types based on different coaching methodologies
 */
export const QUESTION_TYPES = {
  GROW: {
    goal: [
      "What would you like to achieve from this conversation?",
      "What does success look like for you?",
      "What would be different if you achieved this goal?"
    ],
    reality: [
      "What is the current situation?",
      "What have you tried so far?",
      "What obstacles are you facing?"
    ],
    options: [
      "What options do you have?",
      "What else could you do?",
      "Who could help you with this?"
    ],
    way_forward: [
      "What are your next steps?",
      "When will you take this action?",
      "How will you know you've succeeded?"
    ]
  },
  POWERFUL: {
    awareness: [
      "What are you noticing about yourself right now?",
      "What patterns do you see emerging?",
      "What's the story you're telling yourself?"
    ],
    perspective: [
      "How might others see this situation?",
      "What assumptions are you making?",
      "What if the opposite were true?"
    ],
    action: [
      "What's one small step you could take today?",
      "What would you do if you knew you couldn't fail?",
      "What needs to happen for you to move forward?"
    ],
    learning: [
      "What have you learned from this experience?",
      "How has your thinking shifted?",
      "What will you do differently next time?"
    ]
  },
  APPRECIATIVE: {
    discover: [
      "What's working well for you right now?",
      "When have you felt most energized recently?",
      "What strengths are you bringing to this situation?"
    ],
    dream: [
      "What would your ideal outcome look like?",
      "If anything were possible, what would you create?",
      "What excites you most about this possibility?"
    ],
    design: [
      "What resources do you need to make this happen?",
      "How can you build on what's already working?",
      "What support would be most helpful?"
    ],
    destiny: [
      "What commitment are you ready to make?",
      "How will you celebrate your progress?",
      "What will sustain your momentum?"
    ]
  }
};

/**
 * Generate a prompt for AI to create coaching questions
 */
export function generateQuestionPrompt(context, numberOfQuestions, style = 'balanced') {
  const basePrompt = `As an expert executive coach, generate ${numberOfQuestions} powerful coaching question(s) based on the conversation context provided.`;
  
  const styleGuidelines = {
    focused: `
Focus on creating very specific, targeted questions that dig deep into the current topic.
Questions should be short, direct, and challenge the coachee's current thinking.`,
    
    balanced: `
Create a mix of exploratory and action-oriented questions.
Balance between understanding the situation and moving toward solutions.
Questions should encourage both reflection and forward movement.`,
    
    exploratory: `
Focus on open-ended questions that encourage deep exploration and self-discovery.
Questions should help uncover underlying beliefs, values, and motivations.
Avoid leading questions or those that suggest specific actions.`
  };
  
  const contextSection = context ? `
Recent conversation context:
${context}
` : '\nNo specific context provided - generate general powerful coaching questions.\n';
  
  return `${basePrompt}

${styleGuidelines[style] || styleGuidelines.balanced}

Guidelines for powerful coaching questions:
- Use open-ended questions that cannot be answered with yes/no
- Keep questions short and clear (ideally under 15 words)
- Focus on the coachee's thoughts, feelings, and actions
- Avoid "why" questions when possible (use "what" or "how" instead)
- Include questions that challenge assumptions
- Ensure questions are non-judgmental and curious
${contextSection}
Output format: Provide exactly ${numberOfQuestions} question(s), numbered and separated by newlines.
Only output the questions themselves, no additional explanation or context.`;
}

/**
 * Parse AI response to extract questions
 */
export function parseQuestions(response, maxQuestions = 3) {
  if (!response) return [];
  
  // Split by newlines and clean up
  const lines = response.split('\n').filter(line => line.trim());
  
  // Extract questions (remove numbering, bullets, etc.)
  const questions = lines
    .map(line => {
      // Remove common prefixes: numbers, bullets, dashes
      return line
        .replace(/^[\d]+[\.\)]\s*/g, '')  // Remove "1." or "1)"
        .replace(/^[-•*]\s*/g, '')         // Remove bullets
        .replace(/^Q\d+[:.]?\s*/i, '')     // Remove "Q1:" format
        .trim();
    })
    .filter(q => {
      // Keep only valid questions
      return q.length > 10 && q.length < 200 && q.includes('?');
    })
    .slice(0, maxQuestions);
  
  return questions;
}

/**
 * Analyze dialogue to determine appropriate question style
 */
export function analyzeDialogueForQuestionStyle(dialogueBuffer) {
  if (!dialogueBuffer || dialogueBuffer.length === 0) {
    return 'balanced';
  }
  
  const recentText = dialogueBuffer
    .slice(-5)
    .map(item => item.text.toLowerCase())
    .join(' ');
  
  // Check for different conversation patterns
  const patterns = {
    stuck: /stuck|frustrated|don't know|confused|overwhelmed|lost/gi,
    exploring: /thinking|wondering|considering|exploring|curious|interested/gi,
    action: /will|going to|plan|next|step|action|decide|commit/gi,
    emotional: /feel|feeling|felt|angry|sad|happy|excited|worried|anxious/gi
  };
  
  const scores = {
    stuck: (recentText.match(patterns.stuck) || []).length,
    exploring: (recentText.match(patterns.exploring) || []).length,
    action: (recentText.match(patterns.action) || []).length,
    emotional: (recentText.match(patterns.emotional) || []).length
  };
  
  // Determine style based on patterns
  if (scores.stuck > 2) return 'exploratory';
  if (scores.action > 3) return 'focused';
  if (scores.emotional > 2) return 'exploratory';
  
  return 'balanced';
}

/**
 * Get contextual prompts based on coaching methodology
 */
export function getMethodologyPrompt(methodology = 'general') {
  const prompts = {
    general: "Generate coaching questions that help the coachee gain clarity and move forward.",
    
    grow: `Generate questions following the GROW model:
- Goal: What does the coachee want to achieve?
- Reality: What is the current situation?
- Options: What possibilities exist?
- Way Forward: What are the next steps?`,
    
    appreciative: `Generate questions using Appreciative Inquiry:
- Focus on strengths and what's working well
- Explore possibilities and positive futures
- Build on existing resources and successes`,
    
    solution_focused: `Generate solution-focused questions:
- Focus on solutions rather than problems
- Explore what's already working
- Identify small steps toward the preferred future`,
    
    transformational: `Generate transformational coaching questions:
- Challenge limiting beliefs and assumptions
- Explore values and deeper purpose
- Encourage new perspectives and paradigm shifts`
  };
  
  return prompts[methodology] || prompts.general;
}

/**
 * Generate follow-up questions based on response
 */
export function generateFollowUpPrompt(originalQuestion, response, numberOfQuestions = 1) {
  return `The coach asked: "${originalQuestion}"
The coachee responded: "${response}"

Generate ${numberOfQuestions} follow-up question(s) that:
- Build on what the coachee just shared
- Go deeper into the topic without being repetitive
- Help the coachee explore further or clarify their thinking
- Move the conversation forward productively

Output only the question(s), numbered if multiple.`;
}

/**
 * Validate and score question quality
 */
export function scoreQuestionQuality(question) {
  const scores = {
    length: 0,
    openEnded: 0,
    clarity: 0,
    powerful: 0
  };
  
  // Length score (ideal: 8-15 words)
  const wordCount = question.split(' ').length;
  if (wordCount >= 8 && wordCount <= 15) scores.length = 10;
  else if (wordCount >= 5 && wordCount <= 20) scores.length = 7;
  else if (wordCount < 5) scores.length = 3;
  else scores.length = 5;
  
  // Open-ended score
  const closedStarters = /^(do|does|did|is|are|was|were|have|has|had|can|could|will|would|should)/i;
  if (!closedStarters.test(question)) scores.openEnded = 10;
  else scores.openEnded = 3;
  
  // Clarity score (no jargon, simple language)
  const complexWords = /\b\w{12,}\b/g;
  const complexCount = (question.match(complexWords) || []).length;
  scores.clarity = Math.max(0, 10 - (complexCount * 3));
  
  // Powerful question indicators
  const powerfulStarters = /^(what|how|where|when|who|which)/i;
  const powerfulPhrases = /(what.*if|how.*might|what.*possible|what.*learn|what.*notice|what.*different)/i;
  if (powerfulStarters.test(question)) scores.powerful += 5;
  if (powerfulPhrases.test(question)) scores.powerful += 5;
  
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  
  return {
    scores,
    totalScore,
    quality: totalScore >= 30 ? 'excellent' : totalScore >= 20 ? 'good' : 'needs improvement'
  };
}
