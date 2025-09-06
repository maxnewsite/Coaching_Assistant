// components/SupabaseDebugPanel.js
import React, { useState, useEffect } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Button,
  Alert,
  Paper,
  Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { isSupabaseConfigured, testSupabaseConnection } from '../lib/database';

const SupabaseDebugPanel = () => {
  const [debugInfo, setDebugInfo] = useState({
    configured: false,
    connectionTest: null,
    envVars: {
      url: false,
      key: false
    }
  });

  const [testing, setTesting] = useState(false);

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = () => {
    const configured = isSupabaseConfigured();
    const url = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log('Debug - Environment variables:', {
      NEXT_PUBLIC_SUPABASE_URL: url ? 'SET' : 'MISSING',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: key ? 'SET' : 'MISSING'
    });

    setDebugInfo(prev => ({
      ...prev,
      configured,
      envVars: { url, key }
    }));
  };

  const runConnectionTest = async () => {
    setTesting(true);
    try {
      const result = await testSupabaseConnection();
      setDebugInfo(prev => ({
        ...prev,
        connectionTest: result
      }));
    } catch (error) {
      setDebugInfo(prev => ({
        ...prev,
        connectionTest: { success: false, error: error.message }
      }));
    } finally {
      setTesting(false);
    }
  };

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">Database Debug Information</Typography>
        <Chip 
          label={debugInfo.configured ? "Configured" : "Not Configured"} 
          color={debugInfo.configured ? "success" : "error"}
          size="small"
          sx={{ ml: 2 }}
        />
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          
          {/* Environment Variables */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Environment Variables</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip 
                label="NEXT_PUBLIC_SUPABASE_URL" 
                color={debugInfo.envVars.url ? "success" : "error"}
                size="small"
              />
              <Chip 
                label="NEXT_PUBLIC_SUPABASE_ANON_KEY" 
                color={debugInfo.envVars.key ? "success" : "error"}
                size="small"
              />
            </Box>
            {(!debugInfo.envVars.url || !debugInfo.envVars.key) && (
              <Alert severity="error" sx={{ mt: 1 }}>
                Missing environment variables. Add them to your .env.local file:
                <br />
                NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
                <br />
                NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
              </Alert>
            )}
          </Paper>

          {/* Configuration Status */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Configuration Status</Typography>
            <Chip 
              label={debugInfo.configured ? "Supabase Client Ready" : "Supabase Client Not Initialized"}
              color={debugInfo.configured ? "success" : "error"}
            />
          </Paper>

          {/* Connection Test */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Connection Test</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Button 
                variant="outlined" 
                onClick={runConnectionTest}
                disabled={!debugInfo.configured || testing}
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </Button>
              {debugInfo.connectionTest && (
                <Chip 
                  label={debugInfo.connectionTest.success ? "Success" : "Failed"}
                  color={debugInfo.connectionTest.success ? "success" : "error"}
                />
              )}
            </Box>
            {debugInfo.connectionTest && !debugInfo.connectionTest.success && (
              <Alert severity="error">
                Connection failed: {debugInfo.connectionTest.error}
              </Alert>
            )}
          </Paper>

          {/* Setup Instructions */}
          {!debugInfo.configured && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Setup Instructions</Typography>
              <Typography variant="body2" component="div">
                1. Create a Supabase project at{' '}
                <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">
                  supabase.com
                </a>
                <br />
                2. Go to Settings → API in your Supabase dashboard
                <br />
                3. Copy your URL and anon/public key
                <br />
                4. Create a .env.local file in your project root:
                <br />
                <code style={{ backgroundColor: '#f5f5f5', padding: '4px' }}>
                  NEXT_PUBLIC_SUPABASE_URL=your_project_url<br />
                  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
                </code>
                <br />
                5. Run the SQL schema from lib/database-schema.sql in your Supabase SQL editor
                <br />
                6. Restart your development server
              </Typography>
            </Paper>
          )}

        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default SupabaseDebugPanel;
