// components/SettingsDialog.js
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ListSubheader,
  Typography,
  Box,
  Divider,
  IconButton,
  Tooltip,
  Chip,
  Grid,
  RadioGroup,
  FormControlLabel,
  Radio,
  List,
  ListItem,
  ListItemText,
  Alert,
  Tabs,
  Tab,
  Paper,
  Slider,
  Switch
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import { getConfig, setConfig, builtInModelGroups, getModelType } from '../utils/config';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function SettingsDialog({ open, onClose, onSave }) {
  const [settings, setSettings] = useState(getConfig());
  const [tabValue, setTabValue] = useState(0);
  const [newModelName, setNewModelName] = useState('');
  const [newModelId, setNewModelId] = useState('');
  const [newModelType, setNewModelType] = useState('anthropic');
  const [newModelApiEndpoint, setNewModelApiEndpoint] = useState(''); // For custom endpoints

  useEffect(() => {
    if (open) {
      setSettings(getConfig());
      setNewModelName('');
      setNewModelId('');
      setNewModelType('anthropic');
      setNewModelApiEndpoint('');
      setTabValue(0);
    }
  }, [open]);

  const handleChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleAddNewModel = () => {
    if (!newModelName.trim() || !newModelId.trim()) {
      alert('Please provide both a display name and a model ID.');
      return;
    }
    
    const newModel = {
      label: newModelName.trim(),
      value: newModelId.trim(),
      type: newModelType,
      endpoint: newModelApiEndpoint.trim() || undefined
    };
    
    const updatedCustomModels = [...(settings.customModels || []), newModel];
    setSettings({ ...settings, customModels: updatedCustomModels });
    setNewModelName('');
    setNewModelId('');
    setNewModelApiEndpoint('');
  };

  const handleRemoveCustomModel = (indexToRemove) => {
    const updatedCustomModels = (settings.customModels || []).filter((_, index) => index !== indexToRemove);
    let currentAiModel = settings.aiModel;
    
    if (settings.customModels[indexToRemove]?.value === currentAiModel) {
      currentAiModel = 'claude-3-5-sonnet-20241022'; // Default to Claude
    }
    
    setSettings({ ...settings, customModels: updatedCustomModels, aiModel: currentAiModel });
  };

  const handleSave = () => {
    const modelType = getModelType(settings.aiModel);
    
    // Validate API key for selected model
    if (modelType === 'anthropic' && !settings.anthropicKey) {
      alert('Selected Anthropic model requires an Anthropic API key.');
      return;
    }
    if (modelType === 'openai' && !settings.openaiKey) {
      alert('Selected OpenAI model requires an OpenAI API key.');
      return;
    }
    if (modelType === 'gemini' && !settings.geminiKey) {
      alert('Selected Gemini model requires a Gemini API key.');
      return;
    }

    if (!settings.azureToken || !settings.azureRegion) {
      alert('Azure Speech Token and Region are required for voice transcription.');
    }

    setConfig(settings);
    if (onSave) onSave();
    onClose();
  };

  // Combine built-in and custom models for the dropdown
  const getAllModelGroups = () => {
    const groups = [...builtInModelGroups];
    const customGroup = groups.find(g => g.name === "Custom Models");
    if (customGroup) {
      customGroup.models = settings.customModels || [];
    }
    return groups.filter(g => g.name !== "Custom Models" || g.models.length > 0);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider', pb: 1.5 }}>
        Coaching Assistant Settings
        <IconButton aria-label="close" onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 2.5 }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab label="API Keys" />
          <Tab label="AI Configuration" />
          <Tab label="Question Generation" />
          <Tab label="Question Bank" />
          <Tab label="Custom Models" />
          <Tab label="Speech Settings" />
        </Tabs>

        {/* API Keys Tab */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>API Keys</Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Enter API keys for the AI providers you want to use. You only need keys for the models you plan to use.
            </Typography>
          </Alert>
          
          <TextField
            fullWidth margin="dense" name="anthropicKey" label="Anthropic API Key (Claude)" type="password"
            value={settings.anthropicKey || ''} onChange={handleChange}
            helperText="Get your key from console.anthropic.com"
          />
          <TextField
            fullWidth margin="dense" name="openaiKey" label="OpenAI API Key" type="password"
            value={settings.openaiKey || ''} onChange={handleChange}
            helperText="Get your key from platform.openai.com" sx={{ mt: 2 }}
          />
          <TextField
            fullWidth margin="dense" name="geminiKey" label="Google Gemini API Key" type="password"
            value={settings.geminiKey || ''} onChange={handleChange}
            helperText="Get your key from aistudio.google.com" sx={{ mt: 2 }}
          />
        </TabPanel>

        {/* AI Configuration Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>AI Configuration</Typography>
          
          <FormControl fullWidth margin="dense">
            <InputLabel id="ai-model-select-label">AI Model</InputLabel>
            <Select
              labelId="ai-model-select-label" name="aiModel" value={settings.aiModel}
              onChange={handleChange} label="AI Model"
            >
              {getAllModelGroups().map(group => ([
                <ListSubheader key={group.name} sx={{ fontWeight: 'bold', color: 'text.primary', bgcolor: 'transparent' }}>
                  {group.name}
                </ListSubheader>,
                ...group.models.map(model => (
                  <MenuItem key={model.value} value={model.value}>
                    {model.label}
                    {model.endpoint && <Chip label="Custom API" size="small" sx={{ ml: 1 }} />}
                  </MenuItem>
                ))
              ]))}
            </Select>
          </FormControl>
          
          <TextField
            fullWidth margin="dense" name="systemPrompt" label="AI System Prompt for Coaching"
            multiline rows={4} value={settings.systemPrompt} onChange={handleChange}
            helperText="Instructions for the AI assistant to support coaching sessions" sx={{ mt: 2 }}
          />
          
          <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
            <InputLabel id="response-length-label">AI Response Length</InputLabel>
            <Select
              labelId="response-length-label" name="responseLength" value={settings.responseLength}
              onChange={handleChange} label="AI Response Length"
            >
              <MenuItem value="concise">Concise (Brief insights)</MenuItem>
              <MenuItem value="medium">Medium (Balanced detail)</MenuItem>
              <MenuItem value="lengthy">Lengthy (Comprehensive analysis)</MenuItem>
            </Select>
          </FormControl>
        </TabPanel>

        {/* Question Generation Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>Question Generation Settings</Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Configure how and when the AI suggests coaching questions during sessions.
            </Typography>
          </Alert>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Dialogue Listening Duration
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              How many seconds of dialogue to analyze before suggesting questions
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Slider
                name="dialogueListenDuration"
                value={settings.dialogueListenDuration || 30}
                onChange={(e, value) => setSettings({ ...settings, dialogueListenDuration: value })}
                min={10}
                max={120}
                step={5}
                marks={[
                  { value: 10, label: '10s' },
                  { value: 30, label: '30s' },
                  { value: 60, label: '1m' },
                  { value: 90, label: '1.5m' },
                  { value: 120, label: '2m' }
                ]}
                valueLabelDisplay="on"
                valueLabelFormat={(value) => `${value}s`}
                sx={{ flexGrow: 1 }}
              />
              <Typography variant="body1" sx={{ minWidth: 45 }}>
                {settings.dialogueListenDuration || 30}s
              </Typography>
            </Box>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Number of Questions to Generate
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              How many coaching questions should be suggested each time
            </Typography>
            <RadioGroup
              row
              name="numberOfQuestions"
              value={settings.numberOfQuestions || 2}
              onChange={(e) => setSettings({ ...settings, numberOfQuestions: parseInt(e.target.value) })}
            >
              <FormControlLabel 
                value={1} 
                control={<Radio />} 
                label={
                  <Box>
                    <Typography variant="body1">1 Question</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Single, focused question
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel 
                value={2} 
                control={<Radio />} 
                label={
                  <Box>
                    <Typography variant="body1">2 Questions</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Balanced approach
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel 
                value={3} 
                control={<Radio />} 
                label={
                  <Box>
                    <Typography variant="body1">3 Questions</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Multiple perspectives
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <FormControlLabel
            control={
              <Switch
                checked={settings.autoSuggestQuestions || true}
                onChange={(e) => setSettings({ ...settings, autoSuggestQuestions: e.target.checked })}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body1">Auto-Suggest Questions</Typography>
                <Typography variant="caption" color="text.secondary">
                  Automatically generate questions after the dialogue duration
                </Typography>
              </Box>
            }
          />
        </TabPanel>

        {/* Question Bank Tab - NEW */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QuestionAnswerIcon />
            Question Bank
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Paste your coaching questions below, separated by blank lines. These questions will be highlighted automatically when they match the conversation context.
            </Typography>
          </Alert>
          
          <TextField
            fullWidth
            multiline
            rows={15}
            variant="outlined"
            label="Coaching Questions"
            name="questionBank"
            value={settings.questionBank || ''}
            onChange={handleChange}
            placeholder="What would you like to achieve from this conversation?

What does success look like for you?

What assumptions are you making about this situation?

What patterns do you notice in your behavior?"
            helperText="Separate each question with a blank line. The AI will highlight relevant questions during coaching sessions."
            sx={{ mb: 2 }}
          />
          
          <Typography variant="caption" color="text.secondary">
            💡 Tip: Include a mix of exploratory, action-oriented, and perspective-shifting questions for best results.
          </Typography>
        </TabPanel>

        {/* Custom Models Tab */}
        <TabPanel value={tabValue} index={4}>
          <Typography variant="h6" gutterBottom>Add Custom Models</Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Add custom models from any provider (e.g., local models, Azure OpenAI, AWS Bedrock, etc.)
            </Typography>
            <Typography variant="caption">
              Examples: llama-3.1-70b, mixtral-8x7b, azure-gpt-4, bedrock-claude-3
            </Typography>
          </Alert>
          
          <Paper sx={{ p: 2, border: '1px dashed', borderColor: 'divider', mb: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth label="Model Display Name" value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="e.g., GPT-4 Azure"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth label="Model ID / Path" value={newModelId}
                  onChange={(e) => setNewModelId(e.target.value)}
                  placeholder="e.g., gpt-4-azure-deployment"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>API Type</InputLabel>
                  <Select value={newModelType} onChange={(e) => setNewModelType(e.target.value)} label="API Type">
                    <MenuItem value="anthropic">Anthropic Compatible</MenuItem>
                    <MenuItem value="openai">OpenAI Compatible</MenuItem>
                    <MenuItem value="gemini">Gemini Compatible</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth label="Custom Endpoint (Optional)" value={newModelApiEndpoint}
                  onChange={(e) => setNewModelApiEndpoint(e.target.value)}
                  placeholder="e.g., https://api.custom.com/v1"
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained" color="primary" onClick={handleAddNewModel}
                  startIcon={<AddCircleOutlineIcon />}
                  disabled={!newModelName.trim() || !newModelId.trim()}
                >
                  Add Custom Model
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {settings.customModels && settings.customModels.length > 0 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>Your Custom Models:</Typography>
              <List dense>
                {settings.customModels.map((model, index) => (
                  <ListItem
                    key={index}
                    secondaryAction={
                      <IconButton edge="end" onClick={() => handleRemoveCustomModel(index)} size="small">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    }
                    sx={{ mb: 0.5, bgcolor: 'action.hover', borderRadius: 1, p: 1 }}
                  >
                    <ListItemText
                      primary={model.label}
                      secondary={`${model.value} (${model.type}) ${model.endpoint ? '• Custom endpoint' : ''}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </TabPanel>

        {/* Speech Settings Tab */}
        <TabPanel value={tabValue} index={5}>
          <Typography variant="h6" gutterBottom>Speech Configuration</Typography>
          
          <TextField
            fullWidth margin="dense" name="silenceTimerDuration" label="Silence Detection (seconds)"
            type="number" inputProps={{ step: 0.1, min: 0.5, max: 5 }}
            value={settings.silenceTimerDuration} onChange={handleChange}
            helperText="Auto-submit after this duration of silence"
          />
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle1" gutterBottom>Azure Speech Services</Typography>
          <TextField
            fullWidth margin="dense" name="azureToken" label="Azure Speech API Key" type="password"
            value={settings.azureToken || ''} onChange={handleChange}
            helperText="Required for voice transcription"
          />
          <TextField
            fullWidth margin="dense" name="azureRegion" label="Azure Region"
            value={settings.azureRegion || ''} onChange={handleChange}
            helperText="E.g., eastus, westus, westeurope" sx={{ mt: 2 }}
          />
          <TextField
            fullWidth margin="dense" name="azureLanguage" label="Recognition Language"
            value={settings.azureLanguage || ''} onChange={handleChange}
            helperText="E.g., en-US, en-GB, es-ES, fr-FR" sx={{ mt: 2 }}
          />
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button onClick={handleSave} color="primary" variant="contained" startIcon={<SaveIcon />}>
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
}

SettingsDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func
};