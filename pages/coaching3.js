// pages/coaching3.js - Simplified Executive Coaching Assistant (Fixed)
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useTheme,
  Grow,
  Badge
} from '@mui/material';

// MUI Icons
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LiveHelpIcon from '@mui/icons-material/LiveHelp';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import PsychologyIcon from '@mui/icons-material/Psychology';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import SettingsIcon from '@mui/icons-material/Settings';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import TimerIcon from '@mui/icons-material/Timer';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import DownloadIcon from '@mui/icons-material/Download';
import TopicIcon from '@mui/icons-material/Topic';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SignalWifiStatusbar4BarIcon from '@mui/icons-material/SignalWifiStatusbar4Bar';
import HistoryIcon from '@mui/icons-material/History';
import SaveIcon from '@mui/icons-material/Save';
import TranscribeIcon from '@mui/icons-material/Transcribe';

// Third-party Libraries
import { GoogleGenerativeAI } from '@google/generative-ai';
import throttle from 'lodash.throttle';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import OpenAI from 'openai';
import ScrollToBottom from 'react-scroll-to-bottom';

// Local Imports
import SettingsDialog from '../components/SettingsDialog';
import { setAIResponse } from '../redux/aiResponseSlice';
import { addToHistory } from '../redux/historySlice';
import { clearTranscription, setTranscription } from '../redux/transcriptionSlice';
import { getConfig, setConfig as saveConfig, getModelType } from '../utils/config';
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
  const [urgentQuestionsDialog, setUrgentQuestionsDialog] = useState(false);
  const [urgentQuestionsCount, setUrgentQuestionsCount] = useState(2);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [dialogueDuration, setDialogueDuration] = useState(0);
  const [isDialogueActive, setIsDialogueActive] = useState(false);

  // Current Topic States
  const [currentMainTopic, setCurrentMainTopic] = useState('');
  const [summaryTimer, setSummaryTimer] = useState(0);
  const [generatingTopic, setGeneratingTopic] = useState(false);

  // Simplified Session Recording States
  const [sessionRecording, setSessionRecording] = useState({
    sessionId: null,
    startTime: null,
    endTime: null,
    duration: 0,
    language: 'en',
    conversation: [], // Simplified: just chronological conversation
    aiQuestions: [], // Only AI-generated coaching questions
    topics: []
  });
  const [isRecording, setIsRecording] = useState(false);

  // Transcription Status
  const [coachTranscriptionStatus, setCoachTranscriptionStatus] = useState('idle');
  const [coacheeTranscriptionStatus, setCoacheeTranscriptionStatus] = useState('idle');
  const [lastCoachActivity, setLastCoachActivity] = useState(null);
  const [lastCoacheeActivity, setLastCoacheeActivity] = useState(null);

  // Refs
  const dialogueTimerRef = useRef(null);
  const summaryTimerRef = useRef(null);
  const dialogueBufferRef = useRef([]);
  const systemAudioStreamRef = useRef(null);
  const speechBufferRef = useRef({ coach: '', coachee: '' });
  const silenceTimerRef = useRef(null);

  // Utility Functions
  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  const handleSnackbarClose = () => setSnackbarOpen(false);

  // Session Recording Functions
  const startSessionRecording = () => {
    const startTime = new Date();
    const sessionId = `coaching_${startTime.toISOString().replace(/[:.]/g, '_')}`;
    
    const newSessionRecording = {
      sessionId,
      startTime: startTime.toISOString(),
      endTime: null,
      duration: 0,
      language: appConfig.azureLanguage || 'en-US',
      conversation: [],
      aiQuestions: [],
      topics: []
    };

    setSessionRecording(newSessionRecording);
    setIsRecording(true);
    showSnackbar('Session recording started', 'success');
  };

  const stopSessionRecording = () => {
    if (!isRecording) return;

    const endTime = new Date();
    const startTime = new Date(sessionRecording.startTime);
    const duration = Math.floor((endTime - startTime) / 1000);

    setSessionRecording(prev => ({
      ...prev,
      endTime: endTime.toISOString(),
      duration: duration
    }));

    setIsRecording(false);
    
    // Stop all audio recording
    if (isCoachMicActive) stopRecording('coach');
    if (isCoacheeMicActive) stopRecording('coachee');
    if (isSystemAudioActive) stopRecording('system');
    
    // Stop dialogue
    setIsDialogueActive(false);
    
    showSnackbar('Session recording stopped', 'info');
  };

  // Add conversation entry to session recording
  const addConversationEntry = useCallback((text, speaker) => {
    if (!isRecording || !text.trim()) return;

    setSessionRecording(prev => ({
      ...prev,
      conversation: [
        ...prev.conversation,
        {
          timestamp: new Date().toISOString(),
          speaker: speaker, // 'coach' or 'coachee'
          text: text.trim()
        }
      ]
    }));
  }, [isRecording]);

  // Add AI question to session recording
  const addAIQuestionToSession = useCallback((questions) => {
    if (!isRecording || !questions.length) return;

    setSessionRecording(prev => ({
      ...prev,
      aiQuestions: [
        ...prev.aiQuestions,
        {
          timestamp: new Date().toISOString(),
          questions: questions
        }
      ]
    }));
  }, [isRecording]);

  // Add topic to session recording
  const addTopicToSession = useCallback((topic) => {
    if (!isRecording || !topic.trim()) return;

    setSessionRecording(prev => ({
      ...prev,
      topics: [
        ...prev.topics,
        {
          timestamp: new Date().toISOString(),
          topic: topic.trim()
        }
      ]
    }));
  }, [isRecording]);

  // Export simplified session data
  const exportSession = () => {
    if (!sessionRecording.sessionId) {
      showSnackbar('No session to export', 'warning');
      return;
    }

    // Create simple export format
    const exportData = {
      sessionInfo: {
        sessionId: sessionRecording.sessionId,
        startTime: sessionRecording.startTime,
        endTime: sessionRecording.endTime,
        duration: `${Math.floor(sessionRecording.duration / 60)}:${(sessionRecording.duration % 60).toString().padStart(2, '0')}`,
        language: sessionRecording.language
      },
      conversation: sessionRecording.conversation,
      aiQuestions: sessionRecording.aiQuestions,
      topics: sessionRecording.topics,
      summary: {
        totalEntries: sessionRecording.conversation.length,
        coachEntries: sessionRecording.conversation.filter(e => e.speaker === 'coach').length,
        coacheeEntries: sessionRecording.conversation.filter(e => e.speaker === 'coachee').length,
        aiQuestionsGenerated: sessionRecording.aiQuestions.reduce((sum, q) => sum + q.questions.length, 0),
        topicsDiscussed: sessionRecording.topics.length
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sessionRecording.sessionId}_session.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showSnackbar('Session exported successfully', 'success');
  };

  // Settings Management
  const handleSettingsSaved = () => {
    const newConfig = getConfig();
    setAppConfig(newConfig);
    setIsAILoading(true);
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

  // Dialogue Timer Management
  useEffect(() => {
    if (isDialogueActive) {
      dialogueTimerRef.current = setInterval(() => {
        setDialogueDuration(prev => {
          const newDuration = prev + 1;
          
          // Auto-generate questions every configured interval
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

  // Topic Generation Timer (every 2 minutes)
  useEffect(() => {
    if (isDialogueActive) {
      summaryTimerRef.current = setInterval(() => {
        setSummaryTimer(prev => {
          const newTimer = prev + 1;
          if (newTimer >= 120) {
            generateMainTopic();
            return 0;
          }
          return newTimer;
        });
      }, 1000);
    } else {
      if (summaryTimerRef.current) {
        clearInterval(summaryTimerRef.current);
      }
    }
    
    return () => {
      if (summaryTimerRef.current) {
        clearInterval(summaryTimerRef.current);
      }
    };
  }, [isDialogueActive]);

  // Main Topic Generation Function
  const generateMainTopic = async () => {
    if (!aiClient || isAILoading || generatingTopic) return;
    
    const recentText = speechBufferRef.current.coachee.trim();
    if (!recentText) return;

    setGeneratingTopic(true);
    
    try {
      const language = appConfig.azureLanguage === 'it-IT' ? 'Italian' : 'English';
      const prompt = `In ${language}, identify the main topic/theme being discussed in 3-5 words maximum. Based on: "${recentText.substring(0, 200)}"`;
      
      let topicResponse = '';
      if (aiClient.type === 'anthropic') {
        const response = await aiClient.client.messages.create({
          model: appConfig.aiModel,
          max_tokens: 50,
          temperature: 0.3,
          system: `You identify main themes in coaching conversations. Respond only with the main topic in ${language}, maximum 5 words.`,
          messages: [{ role: 'user', content: prompt }]
        });
        topicResponse = response.content[0].text;
      } else if (aiClient.type === 'openai') {
        const response = await aiClient.client.chat.completions.create({
          model: appConfig.aiModel,
          messages: [
            { role: 'system', content: `You identify main themes in coaching conversations. Respond only with the main topic in ${language}, maximum 5 words.` },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 50
        });
        topicResponse = response.choices[0].message.content;
      } else if (aiClient.type === 'gemini') {
        const model = aiClient.client.getGenerativeModel({
          model: appConfig.aiModel,
          generationConfig: { temperature: 0.3, maxOutputTokens: 50 }
        });
        const result = await model.generateContent(prompt);
        topicResponse = result.response.text();
      }
      
      const newTopic = topicResponse.trim();
      setCurrentMainTopic(newTopic);
      addTopicToSession(newTopic);
      
      // Clear the buffer
      speechBufferRef.current = { coach: '', coachee: '' };
      
    } catch (error) {
      console.error('Error generating main topic:', error);
      showSnackbar('Failed to generate main topic: ' + error.message, 'error');
    } finally {
      setGeneratingTopic(false);
    }
  };

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

    // Update transcription status
    if (source === 'coach') {
      setCoachTranscriptionStatus('active');
    } else {
      setCoacheeTranscriptionStatus('active');
    }

    recognizer.recognized = (s, e) => {
      if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech && e.result.text) {
        handleTranscriptionEvent(e.result.text, source);
        
        // Update activity time
        if (source === 'coach') {
          setLastCoachActivity(Date.now());
        } else {
          setLastCoacheeActivity(Date.now());
        }
      }
    };

    recognizer.canceled = (s, e) => {
      console.log(`CANCELED: Reason=${e.reason} for ${source}`);
      if (e.reason === SpeechSDK.CancellationReason.Error) {
        console.error(`CANCELED: ErrorCode=${e.errorCode}`);
        console.error(`CANCELED: ErrorDetails=${e.errorDetails}`);
        showSnackbar(`Speech recognition error for ${source}: ${e.errorDetails}`, 'error');
        if (source === 'coach') {
          setCoachTranscriptionStatus('error');
        } else {
          setCoacheeTranscriptionStatus('error');
        }
      }
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
        
        // Properly close the recognizer and audio config
        if (recognizer.audioConfig?.privSource?.privStream) {
          const stream = recognizer.audioConfig.privSource.privStream;
          if (stream instanceof MediaStream) {
            stream.getTracks().forEach(track => track.stop());
          }
        }
        if (recognizer.audioConfig?.close) {
          recognizer.audioConfig.close();
        }
        if (recognizer.close) {
          recognizer.close();
        }
        
      } catch (error) {
        console.error(`Error stopping ${source} recognition:`, error);
        showSnackbar(`Error stopping ${source} audio: ${error.message}`, 'error');
      } finally {
        // Update states
        if (source === 'coach') {
          setIsCoachMicActive(false);
          setCoachRecognizer(null);
          setCoachTranscriptionStatus('idle');
        } else if (source === 'coachee') {
          setIsCoacheeMicActive(false);
          setCoacheeRecognizer(null);
          setCoacheeTranscriptionStatus('idle');
        } else if (source === 'system') {
          setIsSystemAudioActive(false);
          setCoacheeRecognizer(null);
          setCoacheeTranscriptionStatus('idle');
          
          if (systemAudioStreamRef.current) {
            systemAudioStreamRef.current.getTracks().forEach(track => track.stop());
            systemAudioStreamRef.current = null;
          }
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
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        },
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

      systemAudioStreamRef.current = mediaStream;

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
        systemAudioStreamRef.current = null;
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
      setCoacheeTranscriptionStatus('idle');
      systemAudioStreamRef.current = null;
    }
  };

  const startMicrophoneRecognition = async (source) => {
    const isActive = source === 'coach' ? isCoachMicActive : isCoacheeMicActive;
    
    if (isActive) {
      await stopRecording(source);
      return;
    }

    if (source === 'coachee' && isSystemAudioActive) {
      await stopRecording('system');
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
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
        setCoachTranscriptionStatus('idle');
      } else {
        setIsCoacheeMicActive(false);
        setCoacheeTranscriptionStatus('idle');
      }
    }
  };

  // Transcription Event Handler - SIMPLIFIED
  const handleTranscriptionEvent = (text, source) => {
    const cleanText = text.replace(/\s+/g, ' ').trim();
    if (!cleanText) return;

    // Add to conversation recording
    addConversationEntry(cleanText, source);

    // Start dialogue tracking if not already active
    if (!isDialogueActive) {
      setIsDialogueActive(true);
    }
    
    // Add to speech buffer for topic generation
    speechBufferRef.current[source] += cleanText + ' ';
    
    // Add to dialogue buffer for question generation context
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

    // Show in real-time display
    dispatch(setTranscription(cleanText));
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
    
    const language = appConfig.azureLanguage === 'it-IT' ? 'Italian' : 'English';
    
    const prompt = `Generate exactly ${questionsToGenerate} powerful coaching questions in ${language} based on the conversation context. 

Guidelines:
- Use open-ended questions that cannot be answered with yes/no
- Keep questions short and clear (ideally under 15 words)
- Focus on the coachee's thoughts, feelings, and actions
- Avoid "why" questions when possible (use "what" or "how" instead)
- Include questions that challenge assumptions
- Ensure questions are non-judgmental and curious

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
          system: `You are an expert executive coach. Generate powerful, open-ended coaching questions in ${language}.`,
          messages: [{ role: 'user', content: prompt }]
        });
        questionsResponse = response.content[0].text;
        
      } else if (aiClient.type === 'openai') {
        const response = await aiClient.client.chat.completions.create({
          model: appConfig.aiModel,
          messages: [
            { role: 'system', content: `You are an expert executive coach. Generate powerful, open-ended coaching questions in ${language}.` },
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
      
      // Add questions to session recording
      addAIQuestionToSession(questions);
      
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

  // Use a question
  const useQuestion = (question) => {
    // Add to conversation as coach question
    addConversationEntry(question, 'coach');
    dispatch(setTranscription(`Coach: ${question}`));
    showSnackbar('Question added to conversation', 'success');
  };

  // Component Definitions
  const UrgentQuestionsDialog = () => (
    <Dialog open={urgentQuestionsDialog} onClose={() => setUrgentQuestionsDialog(false)} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LiveHelpIcon color="primary" />
          Generate Coaching Questions
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Generate powerful coaching questions based on the current conversation context.
        </Typography>
        
        <FormControl fullWidth>
          <InputLabel>Number of Questions</InputLabel>
          <Select
            value={urgentQuestionsCount}
            onChange={(e) => setUrgentQuestionsCount(e.target.value)}
            label="Number of Questions"
          >
            <MenuItem value={1}>1 Question - Single focused inquiry</MenuItem>
            <MenuItem value={2}>2 Questions - Balanced exploration</MenuItem>
            <MenuItem value={3}>3 Questions - Multiple perspectives</MenuItem>
          </Select>
        </FormControl>
        
        {dialogueBufferRef.current.length === 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            No recent dialogue captured. Questions will be generated based on general coaching principles.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setUrgentQuestionsDialog(false)}>Cancel</Button>
        <Button 
          onClick={() => {
            generateCoachingQuestions(urgentQuestionsCount);
            setUrgentQuestionsDialog(false);
          }}
          variant="contained"
          color="primary"
          disabled={generatingQuestions}
          startIcon={generatingQuestions ? <CircularProgress size={16} /> : <PsychologyIcon />}
        >
          Generate Questions
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Session Recording Card Component
  const SessionRecordingCard = () => (
    <Card sx={{ mb: 2 }}>
      <CardHeader 
        title="Session Recording"
        avatar={
          <Badge 
            color={isRecording ? "success" : "default"}
            variant="dot"
            sx={{
              '& .MuiBadge-badge': {
                animation: isRecording ? 'pulse 2s infinite' : 'none'
              }
            }}
          >
            <HistoryIcon />
          </Badge>
        }
        subheader={isRecording ? `Recording for ${Math.floor(dialogueDuration / 60)}:${(dialogueDuration % 60).toString().padStart(2, '0')}` : 'Not recording'}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Export Session">
              <IconButton 
                onClick={exportSession} 
                disabled={!sessionRecording.sessionId}
                color="primary"
              >
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant={isRecording ? "outlined" : "contained"}
              color={isRecording ? "error" : "success"}
              onClick={isRecording ? stopSessionRecording : startSessionRecording}
              startIcon={<FiberManualRecordIcon />}
              size="small"
            >
              {isRecording ? 'Stop' : 'Start'}
            </Button>
          </Box>
        }
        sx={{ pb: 1 }}
      />
      <CardContent>
        {isRecording && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  {sessionRecording.conversation.filter(e => e.speaker === 'coach').length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Coach Entries
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="secondary">
                  {sessionRecording.conversation.filter(e => e.speaker === 'coachee').length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Coachee Entries
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="info.main">
                  {sessionRecording.aiQuestions.reduce((sum, q) => sum + q.questions.length, 0)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  AI Questions
                </Typography>
              </Box>
            </Box>
            
            <LinearProgress 
              variant="indeterminate" 
              sx={{ height: 4, borderRadius: 2, mb: 2 }}
              color="success"
            />

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip 
                label={`${sessionRecording.conversation.length} Entries`} 
                size="small" 
                variant="outlined"
              />
              <Chip 
                label={`${sessionRecording.topics.length} Topics`} 
                size="small" 
                variant="outlined"
              />
            </Box>
          </>
        )}

        {!isRecording && sessionRecording.sessionId && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <SaveIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
            <Typography variant="h6" color="text.secondary">
              Session Data Available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {sessionRecording.conversation.length} conversation entries recorded
            </Typography>
          </Box>
        )}

        {!isRecording && !sessionRecording.sessionId && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <TranscribeIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
            <Typography variant="h6" color="text.secondary">
              Ready to Record
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Start recording to capture session data
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  // Main Topic Card Component
  const MainTopicCard = () => (
    <Card sx={{ mb: 2 }}>
      <CardHeader 
        title="Current Main Topic"
        avatar={<TopicIcon />}
        subheader={`Next update in ${Math.floor((120 - summaryTimer) / 60)}:${((120 - summaryTimer) % 60).toString().padStart(2, '0')}`}
        sx={{ pb: 1 }}
      />
      <CardContent>
        {currentMainTopic ? (
          <Paper 
            sx={{ 
              p: 3,
              bgcolor: 'primary.50',
              border: `2px solid ${theme.palette.primary.main}`,
              textAlign: 'center'
            }}
            elevation={3}
          >
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 'bold',
                mb: 1,
                color: 'primary.main'
              }}
            >
              {currentMainTopic}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <TopicIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
            <Typography variant="h6" color="text.secondary">
              {generatingTopic ? 'Analyzing topic...' : 'Topic will appear during active dialogue'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {generatingTopic ? 'Please wait while we identify the main theme...' : 'Main topic updates every 2 minutes'}
            </Typography>
            {generatingTopic && <CircularProgress sx={{ mt: 2 }} />}
          </Box>
        )}
        
        <LinearProgress 
          variant="determinate" 
          value={(summaryTimer / 120) * 100}
          sx={{ mt: 2, height: 6, borderRadius: 3 }}
          color="primary"
        />
      </CardContent>
    </Card>
  );

  // Transcription Status Component
  const TranscriptionStatus = () => {
    const getStatusColor = (status) => {
      switch (status) {
        case 'active': return 'success';
        case 'error': return 'error';
        default: return 'grey';
      }
    };

    const getStatusIcon = (status) => {
      switch (status) {
        case 'active': return <CheckCircleIcon fontSize="small" />;
        case 'error': return <ErrorIcon fontSize="small" />;
        default: return <SignalWifiStatusbar4BarIcon fontSize="small" />;
      }
    };

    const getStatusText = (status, lastActivity, isActive) => {
      if (status === 'error') return 'Error';
      if (status === 'active' && isActive) {
        if (lastActivity && Date.now() - lastActivity < 5000) {
          return 'Active';
        }
        return 'Listening';
      }
      return 'Idle';
    };

    return (
      <Card sx={{ mb: 2 }}>
        <CardHeader 
          title="Audio Status"
          avatar={<SignalWifiStatusbar4BarIcon />}
          sx={{ pb: 1 }}
        />
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getStatusIcon(coacheeTranscriptionStatus)}
              <Typography variant="body2" color={`${getStatusColor(coacheeTranscriptionStatus)}.main`}>
                Coachee: {getStatusText(coacheeTranscriptionStatus, lastCoacheeActivity, isSystemAudioActive || isCoacheeMicActive)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getStatusIcon(coachTranscriptionStatus)}
              <Typography variant="body2" color={`${getStatusColor(coachTranscriptionStatus)}.main`}>
                Coach: {getStatusText(coachTranscriptionStatus, lastCoachActivity, isCoachMicActive)}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
            {(coacheeTranscriptionStatus === 'active' || coachTranscriptionStatus === 'active') ? (
              <>
                <CheckCircleIcon color="success" fontSize="small" />
                <Typography variant="caption" color="success.main">
                  Audio transcription working
                </Typography>
              </>
            ) : (
              <>
                <SignalWifiStatusbar4BarIcon color="info" fontSize="small" />
                <Typography variant="caption" color="text.secondary">
                  Ready to capture audio
                </Typography>
              </>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Main Render
  return (
    <>
      <Head>
        <title>Executive Coaching Assistant - Simplified</title>
      </Head>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar>
            <SmartToyIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'text.primary' }}>
              Executive Coaching Assistant
            </Typography>
            
            {/* Recording Status */}
            {isRecording && (
              <Chip
                icon={<FiberManualRecordIcon sx={{ animation: 'pulse 2s infinite' }} />}
                label="Recording"
                color="error"
                variant="outlined"
                sx={{ mr: 2 }}
              />
            )}
            
            {/* Session Timer */}
            {isDialogueActive && (
              <Chip
                icon={<TimerIcon />}
                label={`${Math.floor(dialogueDuration / 60)}:${(dialogueDuration % 60).toString().padStart(2, '0')}`}
                color="primary"
                variant="outlined"
                sx={{ mr: 2 }}
              />
            )}
            
            <Tooltip title="Settings">
              <IconButton color="primary" onClick={() => setSettingsOpen(true)}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ flexGrow: 1, py: 2, display: 'flex', flexDirection: 'column' }}>
          <Grid container spacing={2} sx={{ flexGrow: 1 }}>
            {/* Left Panel - Session Management */}
            <Grid item xs={12} md={3} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <SessionRecordingCard />
              <MainTopicCard />
              <TranscriptionStatus />
              
              <Card>
                <CardHeader title="Audio Controls" avatar={<RecordVoiceOverIcon />} sx={{ pb: 1 }} />
                <CardContent>
                  <Button
                    onClick={startSystemAudioRecognition}
                    variant="contained"
                    color={isSystemAudioActive ? 'error' : 'primary'}
                    startIcon={isSystemAudioActive ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                    fullWidth
                    size="large"
                    sx={{ mb: 2 }}
                  >
                    {isSystemAudioActive ? 'Stop System Audio' : 'Start System Audio'}
                  </Button>
                  
                  <Button
                    onClick={() => startMicrophoneRecognition('coach')}
                    variant="outlined"
                    color={isCoachMicActive ? 'error' : 'primary'}
                    startIcon={isCoachMicActive ? <MicOffIcon /> : <MicIcon />}
                    fullWidth
                  >
                    {isCoachMicActive ? 'Stop Coach Mic' : 'Start Coach Mic'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* Right Panel - Coaching Questions */}
            <Grid item xs={12} md={9} sx={{ display: 'flex', flexDirection: 'column' }}>
              <Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <CardHeader 
                  title="AI Coaching Questions"
                  avatar={<QuestionAnswerIcon />}
                  action={
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Tooltip title="Generate Questions Now">
                        <IconButton 
                          onClick={() => setUrgentQuestionsDialog(true)}
                          color="primary"
                          disabled={generatingQuestions}
                        >
                          {generatingQuestions ? <CircularProgress size={20} /> : <LiveHelpIcon />}
                        </IconButton>
                      </Tooltip>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => generateCoachingQuestions(appConfig.numberOfQuestions)}
                        disabled={generatingQuestions}
                        startIcon={generatingQuestions ? <CircularProgress size={16} /> : <PsychologyIcon />}
                      >
                        Generate {appConfig.numberOfQuestions || 2}
                      </Button>
                    </Box>
                  }
                  sx={{ pb: 1 }}
                />
                <CardContent sx={{ flexGrow: 1, overflow: 'hidden' }}>
                  {suggestedQuestions.length > 0 ? (
                    <ScrollToBottom className="scroll-to-bottom" followButtonClassName="hidden-follow-button">
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {suggestedQuestions.map((question, index) => (
                          <Grow
                            in={true}
                            timeout={500 + (index * 100)}
                            key={`question-${index}`}
                          >
                            <Paper 
                              sx={{ 
                                p: 3,
                                bgcolor: index === 0 ? 'primary.50' : 'background.paper',
                                border: index === 0 ? `2px solid ${theme.palette.primary.main}` : '1px solid',
                                borderColor: index === 0 ? 'primary.main' : 'divider',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                  transform: 'translateY(-2px)',
                                  boxShadow: theme.shadows[4]
                                }
                              }}
                              elevation={index === 0 ? 3 : 1}
                              onClick={() => useQuestion(question)}
                            >
                              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                <Chip 
                                  label={`Q${index + 1}`} 
                                  size="small" 
                                  color={index === 0 ? "primary" : "default"}
                                  sx={{ mt: 0.5 }}
                                />
                                <Typography 
                                  variant={index === 0 ? "h6" : "body1"} 
                                  sx={{ 
                                    fontWeight: index === 0 ? 'bold' : 'normal',
                                    color: index === 0 ? 'primary.main' : 'text.primary'
                                  }}
                                >
                                  {question}
                                </Typography>
                              </Box>
                            </Paper>
                          </Grow>
                        ))}
                      </Box>
                    </ScrollToBottom>
                  ) : (
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      height: '100%',
                      textAlign: 'center'
                    }}>
                      <PsychologyIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                        {generatingQuestions ? 'Generating Questions...' : 'Ready to Generate Questions'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {generatingQuestions ? 
                          'Please wait while we analyze the conversation...' : 
                          'Click Generate or wait for auto-generation'
                        }
                      </Typography>
                      {generatingQuestions && <CircularProgress sx={{ mt: 2 }} />}
                    </Box>
                  )}
                  
                  {suggestedQuestions.length > 0 && (
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => generateCoachingQuestions(appConfig.numberOfQuestions)}
                        disabled={generatingQuestions}
                      >
                        Generate More
                      </Button>
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => setSuggestedQuestions([])}
                      >
                        Clear All
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>

        {/* Floating Action Button */}
        <Fab
          color="primary"
          onClick={() => generateCoachingQuestions(appConfig.numberOfQuestions)}
          disabled={generatingQuestions || !aiClient || isAILoading}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            display: { xs: 'flex', md: 'none' }
          }}
        >
          {generatingQuestions ? <CircularProgress size={24} color="inherit" /> : <PsychologyIcon />}
        </Fab>

        {/* Dialogs */}
        <UrgentQuestionsDialog />
        <SettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onSave={handleSettingsSaved}
        />
        
        {/* Snackbar */}
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
        .scroll-to-bottom {
          height: 100%;
          width: 100%;
          overflow-y: auto;
        }
        .hidden-follow-button {
          display: none;
        }
        .scroll-to-bottom::-webkit-scrollbar {
          width: 8px;
        }
        .scroll-to-bottom::-webkit-scrollbar-track {
          background: ${theme.palette.background.paper};
          border-radius: 10px;
        }
        .scroll-to-bottom::-webkit-scrollbar-thumb {
          background-color: ${theme.palette.grey[400]};
          border-radius: 10px;
          border: 2px solid ${theme.palette.background.paper};
        }
        .scroll-to-bottom::-webkit-scrollbar-thumb:hover {
          background-color: ${theme.palette.grey[500]};
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </>
  );
}
