// pages/coaching.js - Simplified Executive Coaching Assistant
import { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';

// MUI Components
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Container,
  Fab,
  Grid,
  IconButton,
  List,
  ListItem,
  Paper,
  Snackbar,
  Toolbar,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';

// MUI Icons
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import PersonIcon from '@mui/icons-material/Person';
import PsychologyIcon from '@mui/icons-material/Psychology';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import SettingsIcon from '@mui/icons-material/Settings';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import TimerIcon from '@mui/icons-material/Timer';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

// Third-party Libraries
import { GoogleGenerativeAI } from '@google/generative-ai';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import throttle from 'lodash.throttle';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import OpenAI from 'openai';
import ReactMarkdown from 'react-markdown';
import ScrollToBottom from 'react-scroll-to-bottom';

// Local Imports
import SettingsDialog from '../components/SettingsDialog';
import { setAIResponse } from '../redux/aiResponseSlice';
import { addToHistory } from '../redux/historySlice';
import { clearTranscription, setTranscription } from '../redux/transcriptionSlice';
import { getConfig, setConfig as saveConfig, getModelType, parseQuestionBank } from '../utils/config';
import { generateQuestionPrompt, parseQuestions, analyzeDialogueForQuestionStyle } from '../utils/coachingPrompts';

export default function CoachingPage() {
  const dispatch = useDispatch();
  const transcriptionFromStore = useSelector(state => state.transcription);
  const aiResponseFromStore = useSelector(state => state.aiResponse);
  const history = useSelector(state => state.history);
  const theme = useTheme();

  const [appConfig, setAppConfig] = useState(getConfig());

  // Audio Recognition States
  const [coachRecognizer, setCoachRecognizer] = useState(null);
  const [coacheeRecognizer, setCoacheeRecognizer] = useState(null);
  const [isCoachMicActive, setIsCoachMicActive] = useState(false);
  const [isCoacheeMicActive, setIsCoacheeMicActive] = useState(false);
  const [isSystemAudioActive, setIsSystemAudioActive] = useState(false);
  const [conversationTranscript, setConversationTranscript] = useState([]);

  // AI & Processing States
  const [aiClient, setAiClient] = useState(null);
  const [isAILoading, setIsAILoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // UI States
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');

  // Question Generation States
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [highlightedBankQuestions, setHighlightedBankQuestions] = useState(new Set());
  const [dialogueDuration, setDialogueDuration] = useState(0);
  const [isDialogueActive, setIsDialogueActive] = useState(false);
  
  // Question Bank
  const [questionBank, setQuestionBank] = useState([]);

  // Refs
  const coachInterimTranscription = useRef('');
  const coacheeInterimTranscription = useRef('');
  const silenceTimer = useRef(null);
  const finalTranscript = useRef({ coach: '', coachee: '' });
  const throttledDispatchSetAIResponseRef = useRef(null);
  const dialogueTimerRef = useRef(null);
  const lastQuestionTimeRef = useRef(Date.now());
  const dialogueBufferRef = useRef([]);

  // Utility Functions
  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  const handleSnackbarClose = () => setSnackbarOpen(false);

  // Initialize question bank from config
  useEffect(() => {
    const questions = parseQuestionBank(appConfig.questionBank);
    setQuestionBank(questions);
  }, [appConfig.questionBank]);

  // Settings Management
  const handleSettingsSaved = () => {
    const newConfig = getConfig();
    setAppConfig(newConfig);
    setIsAILoading(true);
    const questions = parseQuestionBank(newConfig.questionBank);
    setQuestionBank(questions);
    showSnackbar('Settings saved successfully', 'success');
  };

  // AI Client Initialization
  useEffect(() => {
    const initializeAI = async () => {
      try {
        const modelType = getModelType(appConfig.aiModel);
        
        if (modelType === 'anthropic') {
          if (!appConfig.anthropicKey) {
            showSnackbar('Anthropic API key required. Please set it in Settings.', 'error');
            setAiClient(null);
            return;
          }
          const { default: Anthropic } = await import('@anthropic-ai/sdk');
          const client = new Anthropic({
            apiKey: appConfig.anthropicKey,
            dangerouslyAllowBrowser: true
          });
          setAiClient({ client, type: 'anthropic' });
        } else if (modelType === 'gemini') {
          if (!appConfig.geminiKey) {
            showSnackbar('Gemini API key required. Please set it in Settings.', 'error');
            setAiClient(null);
            return;
          }
          const genAI = new GoogleGenerativeAI(appConfig.geminiKey);
          setAiClient({ client: genAI, type: 'gemini' });
        } else {
          if (!appConfig.openaiKey) {
            showSnackbar('OpenAI API key required. Please set it in Settings.', 'error');
            setAiClient(null);
            return;
          }
          const openaiClient = new OpenAI({
            apiKey: appConfig.openaiKey,
            dangerouslyAllowBrowser: true
          });
          setAiClient({ client: openaiClient, type: 'openai' });
        }
      } catch (error) {
        console.error('Error initializing AI client:', error);
        showSnackbar('Error initializing AI client: ' + error.message, 'error');
        setAiClient(null);
      } finally {
        setIsAILoading(false);
      }
    };

    if (isAILoading) initializeAI();
  }, [appConfig, isAILoading, showSnackbar]);

  // Throttled AI Response Dispatch
  useEffect(() => {
    throttledDispatchSetAIResponseRef.current = throttle((payload) => {
      dispatch(setAIResponse(payload));
    }, 250, { leading: true, trailing: true });

    return () => {
      if (throttledDispatchSetAIResponseRef.current?.cancel) {
        throttledDispatchSetAIResponseRef.current.cancel();
      }
    };
  }, [dispatch]);

  // Dialogue Timer Management
  useEffect(() => {
    if (isDialogueActive) {
      dialogueTimerRef.current = setInterval(() => {
        setDialogueDuration(prev => {
          const newDuration = prev + 1;
          
          // Check if we should auto-generate questions
          if (appConfig.autoSuggestQuestions && 
              newDuration >= appConfig.dialogueListenDuration &&
              newDuration % appConfig.dialogueListenDuration === 0) {
            generateCoachingQuestions(appConfig.numberOfQuestions);
          }
          
          return newDuration;
        });
      }, 1000);
    } else {
      if (dialogueTimerRef.current) {
        clearInterval(dialogueTimerRef.current);
      }
    }
    
    return () => {
      if (dialogueTimerRef.current) {
        clearInterval(dialogueTimerRef.current);
      }
    };
  }, [isDialogueActive, appConfig]);

  // Speech Recognition Functions
  const createRecognizer = async (mediaStream, source) => {
    if (!appConfig.azureToken || !appConfig.azureRegion) {
      showSnackbar('Azure Speech credentials missing. Please set them in Settings.', 'error');
      mediaStream.getTracks().forEach(track => track.stop());
      return null;
    }

    let audioConfig;
    try {
      audioConfig = SpeechSDK.AudioConfig.fromStreamInput(mediaStream);
    } catch (configError) {
      console.error(`Error creating AudioConfig for ${source}:`, configError);
      showSnackbar(`Error setting up audio for ${source}: ${configError.message}`, 'error');
      mediaStream.getTracks().forEach(track => track.stop());
      return null;
    }

    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(appConfig.azureToken, appConfig.azureRegion);
    speechConfig.speechRecognitionLanguage = appConfig.azureLanguage;

    const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

    recognizer.recognizing = (s, e) => {
      if (e.result.reason === SpeechSDK.ResultReason.RecognizingSpeech) {
        const interimText = e.result.text;
        if (source === 'coachee') {
          coacheeInterimTranscription.current = interimText;
        } else {
          coachInterimTranscription.current = interimText;
        }
      }
    };

    recognizer.recognized = (s, e) => {
      if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech && e.result.text) {
        if (source === 'coachee') coacheeInterimTranscription.current = '';
        else coachInterimTranscription.current = '';
        handleTranscriptionEvent(e.result.text, source);
      }
    };

    recognizer.canceled = (s, e) => {
      console.log(`CANCELED: Reason=${e.reason} for ${source}`);
      if (e.reason === SpeechSDK.CancellationReason.Error) {
        console.error(`CANCELED: ErrorCode=${e.errorCode}`);
        console.error(`CANCELED: ErrorDetails=${e.errorDetails}`);
        showSnackbar(`Speech recognition error for ${source}: ${e.errorDetails}`, 'error');
      }
      stopRecording(source);
    };

    recognizer.sessionStopped = (s, e) => {
      console.log(`Session stopped event for ${source}.`);
      stopRecording(source);
    };

    try {
      await recognizer.startContinuousRecognitionAsync();
      return recognizer;
    } catch (error) {
      console.error(`Error starting ${source} continuous recognition:`, error);
      showSnackbar(`Failed to start ${source} recognition: ${error.message}`, 'error');
      if (audioConfig?.close) audioConfig.close();
      mediaStream.getTracks().forEach(track => track.stop());
      return null;
    }
  };

  const stopRecording = async (source) => {
    const recognizer = source === 'coach' ? coachRecognizer : 
                      source === 'coachee' ? coacheeRecognizer : null;
    
    if (recognizer?.stopContinuousRecognitionAsync) {
      try {
        await recognizer.stopContinuousRecognitionAsync();
        if (recognizer.audioConfig?.privSource?.privStream) {
          const stream = recognizer.audioConfig.privSource.privStream;
          if (stream instanceof MediaStream) {
            stream.getTracks().forEach(track => track.stop());
          }
        }
        if (recognizer.audioConfig?.close) {
          recognizer.audioConfig.close();
        }
      } catch (error) {
        console.error(`Error stopping ${source} recognition:`, error);
        showSnackbar(`Error stopping ${source} audio: ${error.message}`, 'error');
      } finally {
        if (source === 'coach') {
          setIsCoachMicActive(false);
          setCoachRecognizer(null);
        } else if (source === 'coachee') {
          setIsCoacheeMicActive(false);
          setCoacheeRecognizer(null);
        } else if (source === 'system') {
          setIsSystemAudioActive(false);
          setCoacheeRecognizer(null);
        }
      }
    }
  };

  const startSystemAudioRecognition = async () => {
    if (isSystemAudioActive) {
      await stopRecording('system');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      showSnackbar('Screen sharing is not supported by your browser.', 'error');
      setIsSystemAudioActive(false);
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: {
          displaySurface: 'browser',
          logicalSurface: true
        }
      });

      const audioTracks = mediaStream.getAudioTracks();
      if (audioTracks.length === 0) {
        showSnackbar('No audio track detected. Please ensure you share a tab with audio.', 'warning');
        mediaStream.getTracks().forEach(track => track.stop());
        return;
      }

      if (coacheeRecognizer) {
        await stopRecording('system');
      }

      const recognizerInstance = await createRecognizer(mediaStream, 'coachee');
      if (recognizerInstance) {
        setCoacheeRecognizer(recognizerInstance);
        setIsSystemAudioActive(true);
        showSnackbar('System audio recording started for coachee.', 'success');
        mediaStream.getTracks().forEach(track => {
          track.onended = () => {
            showSnackbar('Tab sharing ended.', 'info');
            stopRecording('system');
          };
        });
      } else {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    } catch (error) {
      console.error('System audio capture error:', error);
      if (error.name === "NotAllowedError") {
        showSnackbar('Permission denied for screen recording. Please allow access.', 'error');
      } else if (error.name === "NotFoundError") {
        showSnackbar('No suitable tab/window found to share.', 'error');
      } else if (error.name === "NotSupportedError") {
        showSnackbar('System audio capture not supported by your browser.', 'error');
      } else {
        showSnackbar(`Failed to start system audio capture: ${error.message || 'Unknown error'}`, 'error');
      }
      setIsSystemAudioActive(false);
    }
  };

  const startMicrophoneRecognition = async (source) => {
    const isActive = source === 'coach' ? isCoachMicActive : isCoacheeMicActive;
    
    if (isActive) {
      await stopRecording(source);
      return;
    }

    // For coachee, stop system audio if it's active
    if (source === 'coachee' && isSystemAudioActive) {
      await stopRecording('system');
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const currentRecognizer = source === 'coach' ? coachRecognizer : coacheeRecognizer;
      
      if (currentRecognizer) await stopRecording(source);

      const recognizerInstance = await createRecognizer(mediaStream, source);
      if (recognizerInstance) {
        if (source === 'coach') {
          setCoachRecognizer(recognizerInstance);
          setIsCoachMicActive(true);
        } else {
          setCoacheeRecognizer(recognizerInstance);
          setIsCoacheeMicActive(true);
        }
        showSnackbar(`${source === 'coach' ? 'Coach' : 'Coachee'} microphone recording started.`, 'success');
      } else {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    } catch (error) {
      console.error('Microphone capture error:', error);
      if (error.name === "NotAllowedError" || error.name === "NotFoundError") {
        showSnackbar('Permission denied for microphone. Please allow access.', 'error');
      } else {
        showSnackbar(`Failed to access microphone: ${error.message || 'Unknown error'}`, 'error');
      }
      if (source === 'coach') {
        setIsCoachMicActive(false);
      } else {
        setIsCoacheeMicActive(false);
      }
    }
  };

  // Transcription Event Handler
  const handleTranscriptionEvent = (text, source) => {
    const cleanText = text.replace(/\s+/g, ' ').trim();
    if (!cleanText) return;

    // Start dialogue tracking if not already active
    if (!isDialogueActive) {
      setIsDialogueActive(true);
    }
    
    // Reset the last activity time
    lastQuestionTimeRef.current = Date.now();
    
    // Add to dialogue buffer for context
    dialogueBufferRef.current.push({
      text: cleanText,
      source: source,
      timestamp: Date.now()
    });
    
    // Keep only recent dialogue (last 5 minutes)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    dialogueBufferRef.current = dialogueBufferRef.current.filter(
      item => item.timestamp > fiveMinutesAgo
    );

    // Add to conversation transcript
    const newEntry = {
      id: Date.now(),
      speaker: source,
      text: cleanText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setConversationTranscript(prev => [...prev, newEntry]);

    // Highlight relevant questions from bank
    highlightRelevantQuestions(cleanText, source);

    // Auto-generate questions based on the conversation
    if (appConfig.autoSuggestQuestions) {
      const shouldGenerate = Math.random() < 0.3; // 30% chance per new dialogue entry
      if (shouldGenerate) {
        setTimeout(() => generateCoachingQuestions(1), 2000);
      }
    }
  };

  // Question Bank Highlighting
  const highlightRelevantQuestions = (text, source) => {
    if (questionBank.length === 0) return;

    const keywords = text.toLowerCase().split(' ').filter(word => word.length > 3);
    const newHighlighted = new Set();

    questionBank.forEach((question, index) => {
      const questionLower = question.toLowerCase();
      const relevanceScore = keywords.filter(keyword => questionLower.includes(keyword)).length;
      
      // Also check for semantic relevance with simple heuristics
      const isRelevant = relevanceScore > 0 || 
                        (text.toLowerCase().includes('stuck') && questionLower.includes('next')) ||
                        (text.toLowerCase().includes('goal') && questionLower.includes('achieve')) ||
                        (text.toLowerCase().includes('challenge') && questionLower.includes('strength')) ||
                        (text.toLowerCase().includes('decision') && questionLower.includes('option'));

      if (isRelevant) {
        newHighlighted.add(index);
      }
    });

    setHighlightedBankQuestions(newHighlighted);
    
    // Auto-fade highlights after 30 seconds
    setTimeout(() => {
      setHighlightedBankQuestions(new Set());
    }, 30000);
  };

  // Question Generation
  const generateCoachingQuestions = async (numQuestions = null) => {
    const questionsToGenerate = numQuestions || appConfig.numberOfQuestions || 2;
    
    if (!aiClient || isAILoading) {
      showSnackbar('AI client is not ready. Please wait or check settings.', 'warning');
      return;
    }
    
    setGeneratingQuestions(true);
    
    // Gather recent dialogue context
    const recentDialogue = dialogueBufferRef.current
      .slice(-10)
      .map(item => `${item.source}: ${item.text}`)
      .join('\n');
    
    const questionStyle = analyzeDialogueForQuestionStyle(dialogueBufferRef.current);
    const languageInstructions = getLanguageInstructions(appConfig.azureLanguage || 'en-US');
    
    const prompt = `As an expert executive coach, generate exactly ${questionsToGenerate} powerful coaching question(s) based on the conversation context provided.

${languageInstructions}

Guidelines for powerful coaching questions:
- Use open-ended questions that cannot be answered with yes/no
- Keep questions short and clear (ideally under 15 words)
- Focus on the coachee's thoughts, feelings, and actions
- Avoid "why" questions when possible (use "what" or "how" instead)
- Include questions that challenge assumptions
- Ensure questions are non-judgmental and curious

Style: ${questionStyle}

Recent conversation context:
${recentDialogue || 'No recent dialogue captured yet.'}

Please provide exactly ${questionsToGenerate} question(s), numbered and separated by newlines. Only provide the questions themselves, no additional explanation or context.`;

    try {
      let questionsResponse = '';
      
      if (aiClient.type === 'anthropic') {
        const response = await aiClient.client.messages.create({
          model: appConfig.aiModel,
          max_tokens: 200,
          temperature: 0.7,
          system: "You are an expert executive coach. Generate powerful, open-ended coaching questions in the requested language.",
          messages: [{ role: 'user', content: prompt }]
        });
        questionsResponse = response.content[0].text;
        
      } else if (aiClient.type === 'openai') {
        const response = await aiClient.client.chat.completions.create({
          model: appConfig.aiModel,
          messages: [
            { role: 'system', content: "You are an expert executive coach. Generate powerful, open-ended coaching questions in the requested language." },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 200
        });
        questionsResponse = response.choices[0].message.content;
        
      } else if (aiClient.type === 'gemini') {
        const model = aiClient.client.getGenerativeModel({
          model: appConfig.aiModel,
          generationConfig: { temperature: 0.7, maxOutputTokens: 200 }
        });
        const result = await model.generateContent(prompt);
        questionsResponse = result.response.text();
      }
      
      // Parse the questions
      const questions = parseQuestions(questionsResponse, questionsToGenerate);
      
      // Add newest questions to the TOP of the array
      setSuggestedQuestions(prev => [...questions, ...prev]);
      
      showSnackbar(`Generated ${questions.length} coaching question(s)`, 'success');
      
    } catch (error) {
      console.error('Error generating questions:', error);
      showSnackbar('Failed to generate questions: ' + error.message, 'error');
    } finally {
      setGeneratingQuestions(false);
    }
  };

  // Helper function for language instructions
  const getLanguageInstructions = (azureLanguage) => {
    const languageMap = {
      'en-US': 'English',
      'en-GB': 'English', 
      'it-IT': 'Italian',
      'fr-FR': 'French',
      'es-ES': 'Spanish',
      'de-DE': 'German',
      'pt-PT': 'Portuguese',
      'nl-NL': 'Dutch',
      'ru-RU': 'Russian',
      'ja-JP': 'Japanese',
      'ko-KR': 'Korean',
      'zh-CN': 'Chinese (Simplified)',
      'zh-TW': 'Chinese (Traditional)'
    };
    
    const language = languageMap[azureLanguage] || 'English';
    
    if (language === 'English') {
      return 'Generate questions in English.';
    }
    
    return `Generate questions in ${language}. Ensure the questions are:
- Natural and fluent in ${language}
- Culturally appropriate for ${language}-speaking contexts
- Using proper coaching terminology in ${language}`;
  };

  // Use a pre-loaded question
  const useQuestion = (question) => {
    const newEntry = {
      id: Date.now(),
      speaker: 'coach',
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setConversationTranscript(prev => [...prev, newEntry]);
    showSnackbar('Question added to conversation', 'success');
  };

  // Main Render
  return (
    <>
      <Head>
        <title>Executive Coaching Assistant - Simplified</title>
      </Head>
      
      <Box sx={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <AppBar position="static" sx={{ 
          background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <Toolbar>
            <SmartToyIcon sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Executive Coaching Assistant
            </Typography>
            
            {/* Status Indicator */}
            {isDialogueActive && (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                background: 'rgba(255,255,255,0.1)', 
                padding: '6px 12px', 
                borderRadius: '20px',
                mr: 2
              }}>
                <Box sx={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  background: '#4CAF50',
                  animation: 'pulse 2s infinite'
                }} />
                <Typography variant="body2">Live Session</Typography>
              </Box>
            )}

            {/* Session Timer */}
            {isDialogueActive && (
              <Chip
                icon={<TimerIcon />}
                label={`${Math.floor(dialogueDuration / 60)}:${(dialogueDuration % 60).toString().padStart(2, '0')}`}
                sx={{ mr: 2, background: 'rgba(255,255,255,0.1)', color: 'white' }}
              />
            )}
            
            <Tooltip title="Settings">
              <IconButton color="inherit" onClick={() => setSettingsOpen(true)}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <Container maxWidth="xl" sx={{ flexGrow: 1, py: 3, display: 'flex' }}>
          <Grid container spacing={3} sx={{ height: 'calc(100vh - 140px)' }}>
            
            {/* Main Panel - Conversation */}
            <Grid item xs={12} md={8} sx={{ display: 'flex', flexDirection: 'column' }}>
              <Card sx={{ 
                flexGrow: 1, 
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: 4,
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
              }}>
                <CardHeader 
                  title="Live Conversation"
                  avatar={<RecordVoiceOverIcon />}
                  action={
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      {/* Recording Controls */}
                      <Tooltip title={isSystemAudioActive ? "Stop System Audio" : "Start System Audio"}>
                        <IconButton 
                          onClick={startSystemAudioRecognition}
                          color={isSystemAudioActive ? "error" : "primary"}
                          size="small"
                        >
                          {isSystemAudioActive ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title={isCoachMicActive ? "Stop Coach Mic" : "Start Coach Mic"}>
                        <IconButton 
                          onClick={() => startMicrophoneRecognition('coach')}
                          color={isCoachMicActive ? "error" : "primary"}
                          size="small"
                        >
                          {isCoachMicActive ? <MicOffIcon /> : <MicIcon />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                  sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}
                />
                
                <CardContent sx={{ flexGrow: 1, overflow: 'hidden', p: 0 }}>
                  <ScrollToBottom 
                    className="conversation-scroll"
                    followButtonClassName="hidden-follow-button"
                  >
                    <Box sx={{ p: 2 }}>
                      {conversationTranscript.length === 0 ? (
                        <Box sx={{ 
                          textAlign: 'center', 
                          py: 8, 
                          color: 'text.secondary' 
                        }}>
                          <Typography variant="h2" sx={{ mb: 2 }}>🎙️</Typography>
                          <Typography variant="h6" gutterBottom>
                            Waiting for conversation...
                          </Typography>
                          <Typography variant="body2">
                            Start system audio capture or microphone to begin transcribing the coaching session
                          </Typography>
                        </Box>
                      ) : (
                        conversationTranscript.map((entry) => (
                          <Paper 
                            key={entry.id}
                            sx={{ 
                              p: 2, 
                              mb: 2, 
                              borderLeft: `4px solid ${entry.speaker === 'coach' ? '#10b981' : '#f59e0b'}`,
                              backgroundColor: 'background.default'
                            }}
                          >
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                fontWeight: 600, 
                                textTransform: 'uppercase',
                                color: entry.speaker === 'coach' ? '#10b981' : '#f59e0b',
                                letterSpacing: 1
                              }}
                            >
                              {entry.speaker === 'coach' ? 'Coach' : 'Coachee'} • {entry.timestamp}
                            </Typography>
                            <Typography variant="body1" sx={{ mt: 0.5, lineHeight: 1.6 }}>
                              {entry.text}
                            </Typography>
                          </Paper>
                        ))
                      )}
                    </Box>
                  </ScrollToBottom>
                </CardContent>
              </Card>
            </Grid>

            {/* Sidebar - Questions */}
            <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              
              {/* AI Generated Questions */}
              <Card sx={{ borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                <CardHeader 
                  title="AI Suggested Questions"
                  avatar={<AutoAwesomeIcon />}
                  action={
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => generateCoachingQuestions()}
                      disabled={generatingQuestions || !aiClient || isAILoading}
                      startIcon={generatingQuestions ? <CircularProgress size={16} color="inherit" /> : <PsychologyIcon />}
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      {generatingQuestions ? 'Generating...' : 'Generate'}
                    </Button>
                  }
                  sx={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    '& .MuiCardHeader-action': { color: 'inherit' }
                  }}
                />
                <CardContent sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {suggestedQuestions.length > 0 ? (
                    <List dense>
                      {suggestedQuestions.slice(0, 6).map((question, index) => (
                        <ListItem 
                          key={index}
                          sx={{ 
                            p: 1.5, 
                            mb: 1, 
                            borderRadius: 2,
                            background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                            border: '1px solid #3b82f6',
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                            }
                          }}
                          onClick={() => useQuestion(question)}
                        >
                          <Box sx={{ width: '100%' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                              {question}
                            </Typography>
                            <Chip 
                              label="AI Generated" 
                              size="small" 
                              color="primary" 
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                      <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                        {generatingQuestions ? 'Generating questions...' : 'Click "Generate" to create AI-powered coaching questions based on the conversation'}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Question Bank */}
              <Card sx={{ flexGrow: 1, borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                <CardHeader 
                  title="Question Bank"
                  subheader="Pre-loaded coaching questions"
                  avatar={<QuestionAnswerIcon />}
                  sx={{ 
                    background: 'linear-gradient(135deg, #fa8c16 0%, #faad14 100%)',
                    color: 'white',
                    '& .MuiCardHeader-subheader': { color: 'rgba(255,255,255,0.9)' }
                  }}
                />
                <CardContent sx={{ flexGrow: 1, overflow: 'auto', maxHeight: 400 }}>
                  {questionBank.length > 0 ? (
                    <List dense>
                      {questionBank.map((question, index) => {
                        const isHighlighted = highlightedBankQuestions.has(index);
                        return (
                          <ListItem 
                            key={index}
                            sx={{ 
                              p: 1.5, 
                              mb: 1, 
                              borderRadius: 2,
                              background: isHighlighted ? 
                                'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : 
                                '#f8fafc',
                              border: isHighlighted ? 
                                '1px solid #f59e0b' : 
                                '1px solid #e2e8f0',
                              cursor: 'pointer',
                              transition: 'all 0.3s',
                              boxShadow: isHighlighted ? 
                                '0 4px 20px rgba(245, 158, 11, 0.3)' : 
                                'none',
                              transform: isHighlighted ? 'translateY(-1px)' : 'none',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                              },
                              animation: isHighlighted ? 'glow 2s ease-in-out' : 'none'
                            }}
                            onClick={() => useQuestion(question)}
                          >
                            <Box sx={{ width: '100%', position: 'relative' }}>
                              {isHighlighted && (
                                <Chip 
                                  label="Match" 
                                  size="small" 
                                  sx={{ 
                                    position: 'absolute',
                                    top: -6,
                                    right: -6,
                                    background: '#f59e0b',
                                    color: 'white',
                                    fontSize: '0.65rem',
                                    height: 18,
                                    animation: 'pulse 1.5s infinite'
                                  }}
                                />
                              )}
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: isHighlighted ? 600 : 500, 
                                  lineHeight: 1.4 
                                }}
                              >
                                {question}
                              </Typography>
                            </Box>
                          </ListItem>
                        );
                      })}
                    </List>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                      <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                        No questions in bank. Add questions in Settings → Question Bank.
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>

        {/* Floating Action Button */}
        <Fab
          color="secondary"
          onClick={() => generateCoachingQuestions()}
          disabled={generatingQuestions || !aiClient || isAILoading}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
            }
          }}
        >
          {generatingQuestions ? <CircularProgress size={24} color="inherit" /> : <FlashOnIcon />}
        </Fab>

        {/* Dialogs */}
        <SettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onSave={handleSettingsSaved}
        />
        
        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={4000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
      
      {/* Global Styles */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 4px 20px rgba(245, 158, 11, 0.3); }
          50% { box-shadow: 0 8px 30px rgba(245, 158, 11, 0.5); }
        }
        
        .conversation-scroll {
          height: 100%;
          width: 100%;
          overflow-y: auto;
        }
        .hidden-follow-button {
          display: none;
        }
        .conversation-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .conversation-scroll::-webkit-scrollbar-track {
          background: ${theme.palette.background.paper};
          border-radius: 10px;
        }
        .conversation-scroll::-webkit-scrollbar-thumb {
          background-color: ${theme.palette.grey[400]};
          border-radius: 10px;
        }
        .conversation-scroll::-webkit-scrollbar-thumb:hover {
          background-color: ${theme.palette.grey[500]};
        }
      `}</style>
    </>
  );
}