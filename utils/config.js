// utils/config.js
export const builtInModelGroups = [
  {
    name: "Anthropic Models",
    models: [
      { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet (Latest)" },
      { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
      { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
      { value: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet" },
      { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
    ]
  },
  {
    name: "OpenAI Models", 
    models: [
      { value: "gpt-4o", label: "GPT-4o (Latest)" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
      { value: "gpt-4", label: "GPT-4" },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    ]
  },
  {
    name: "Gemini Models",
    models: [
      { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash (Experimental)" },
      { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
      { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    ]
  },
  {
    name: "Custom Models",
    models: [] // Will be populated from user's custom models
  }
];

const defaultQuestionBank = `What would you like to achieve from this conversation?

What does success look like for you?

What assumptions are you making about this situation?

What patterns do you notice in your behavior?

What would you do if you knew you couldn't fail?

How might others see this situation?

What's the cost of maintaining the status quo?

What support do you need to move forward?

What would you tell a friend in a similar situation?

What strengths can you leverage in this challenge?

What's one small step you could take today?

How do you define success in this situation?

What would need to be true for this to work?

What are you avoiding in this situation?

What would be different if you achieved this goal?`;

const defaultConfig = {
  // API Keys
  anthropicKey: '',
  openaiKey: '',
  geminiKey: '',
  
  // Model Selection
  aiModel: 'claude-3-5-sonnet-20241022', // Default to Claude
  
  // Question Generation Settings (Primary focus)
  dialogueListenDuration: 30, // Seconds of dialogue before suggesting questions (default 30 seconds)
  numberOfQuestions: 2, // Number of questions to generate (1-3)
  autoSuggestQuestions: true, // Automatically suggest questions after dialogue duration
  
  // Question Bank
  questionBank: defaultQuestionBank, // Pre-loaded questions
  
  // System Prompt for Question Generation (Updated focus)
  systemPrompt: `You are an expert executive coaching question generator. Your sole purpose is to create powerful, open-ended coaching questions based on dialogue context.

Key Principles:
- Generate only coaching questions, no commentary or advice
- Focus on open-ended questions that promote self-discovery
- Keep questions concise and impactful (under 15 words)
- Use "what" and "how" rather than "why" questions
- Challenge assumptions while remaining non-judgmental
- Adapt questions to the conversation context and energy
- Create questions that move the coachee toward insights and action

You will receive conversation snippets and generate the exact number of questions requested. Respond only with the numbered questions, nothing else.`,
  
  // Azure Speech Settings
  azureToken: '',
  azureRegion: 'eastus',
  azureLanguage: 'en-US',
  
  // Custom Models & Preferences
  customModels: [],
  
  // Legacy settings (kept for compatibility but not actively used)
  silenceTimerDuration: 1.5, // Kept for potential future use
  responseLength: 'medium', // Not used in question-only mode
  coacheeAutoMode: true, // Not used in question-only mode
  isManualMode: false, // Not used in question-only mode
};

export function getConfig() {
  if (typeof window !== 'undefined') {
    const storedConfig = localStorage.getItem('coachingAssistantConfig');
    let parsed = storedConfig ? JSON.parse(storedConfig) : {};
    
    // Migration from old config
    if (parsed.gptSystemPrompt && !parsed.systemPrompt) {
      // If old system prompt exists, replace it with new question-focused prompt
      parsed.systemPrompt = defaultConfig.systemPrompt;
      delete parsed.gptSystemPrompt;
    }
    if (parsed.systemAutoMode !== undefined && parsed.coacheeAutoMode === undefined) {
      parsed.coacheeAutoMode = parsed.systemAutoMode;
      delete parsed.systemAutoMode;
    }
    
    // Ensure systemPrompt is updated to question-focused version
    if (!parsed.systemPrompt || parsed.systemPrompt.includes('coaching assistant') || parsed.systemPrompt.includes('support the coach')) {
      parsed.systemPrompt = defaultConfig.systemPrompt;
    }
    
    // Ensure customModels is an array
    if (!Array.isArray(parsed.customModels)) {
      parsed.customModels = [];
    }

    // Ensure questionBank exists
    if (!parsed.questionBank) {
      parsed.questionBank = defaultQuestionBank;
    }

    // Ensure question generation settings exist
    if (parsed.dialogueListenDuration === undefined) {
      parsed.dialogueListenDuration = 30;
    }
    if (parsed.numberOfQuestions === undefined) {
      parsed.numberOfQuestions = 2;
    }
    if (parsed.autoSuggestQuestions === undefined) {
      parsed.autoSuggestQuestions = true;
    }

    return { ...defaultConfig, ...parsed };
  }
  return defaultConfig;
}

export function setConfig(config) {
  if (typeof window !== 'undefined') {
    const configToSave = {
      ...config,
      customModels: Array.isArray(config.customModels) ? config.customModels : [],
      questionBank: config.questionBank || defaultQuestionBank,
      // Ensure system prompt stays question-focused
      systemPrompt: config.systemPrompt || defaultConfig.systemPrompt
    };
    localStorage.setItem('coachingAssistantConfig', JSON.stringify(configToSave));
  }
}

// Helper function to parse question bank into array
export function parseQuestionBank(questionBankText) {
  if (!questionBankText) return [];
  
  return questionBankText
    .split('\n\n')
    .map(q => q.trim())
    .filter(q => q.length > 0 && q.includes('?'));
}

// Helper function to determine API type from model name
export function getModelType(modelName) {
  if (modelName.startsWith('claude')) return 'anthropic';
  if (modelName.startsWith('gpt')) return 'openai';
  if (modelName.startsWith('gemini')) return 'gemini';
  
  // Check custom models
  const config = getConfig();
  const customModel = config.customModels.find(m => m.value === modelName);
  if (customModel) return customModel.type;
  
  return 'openai'; // default fallback
}
