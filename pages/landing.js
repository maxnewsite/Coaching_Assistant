import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Box, 
  Button, 
  Container, 
  Grid, 
  Typography, 
  Card,
  CardContent,
  Chip,
  Paper
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

// Apple-style theme colors
const colors = {
  black: '#000000',
  white: '#ffffff',
  gray: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  }
};

// Styled Components with Apple aesthetics
const HeroSection = styled(Box)({
  backgroundColor: colors.white,
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '4rem 0',
});

const AppleButton = styled(Button)({
  borderRadius: '50px',
  padding: '16px 48px',
  fontSize: '1.1rem',
  fontWeight: 500,
  textTransform: 'none',
  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
  }
});

const FeatureCard = styled(Card)({
  height: '100%',
  border: 'none',
  boxShadow: 'none',
  backgroundColor: 'transparent',
  '& .MuiCardContent-root': {
    padding: '2rem 0',
  }
});

const StatsCard = styled(Paper)({
  padding: '2rem',
  textAlign: 'center',
  backgroundColor: colors.white,
  border: `1px solid ${colors.gray[100]}`,
  borderRadius: '16px',
  boxShadow: 'none',
  transition: 'transform 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
  }
});

const GraySection = styled(Box)({
  backgroundColor: colors.gray[50],
  padding: '6rem 0',
});

const BlackSection = styled(Box)({
  backgroundColor: colors.black,
  color: colors.white,
  padding: '6rem 0',
  textAlign: 'center',
});

const StepBox = styled(Box)({
  padding: '3rem 0',
});

const features = [
  {
    title: 'Real-Time Transcription',
    description: 'Capture every word with Azure-powered speech recognition for both coach and coachee, with speaking indicators and multi-language support.',
    capabilities: ['Live transcription', 'Speaker detection', 'Multi-language', 'High accuracy']
  },
  {
    title: 'System Audio Capture',
    description: 'Perfect for remote coaching sessions - capture audio directly from video calls and online meetings with seamless integration.',
    capabilities: ['Remote sessions', 'Video call audio', 'Screen sharing', 'Tab audio capture']
  },
  {
    title: 'AI Question Generation',
    description: 'Intelligent coaching questions generated in real-time based on conversation context using ChatGPT, Claude, or Gemini AI models.',
    capabilities: ['Context-aware', 'Multiple AI models', 'Custom prompts', 'Smart timing']
  },
  {
    title: 'Question Management',
    description: 'Curated library of powerful coaching questions with ability to activate, customize, and manage your question toolkit.',
    capabilities: ['Pre-loaded questions', 'Custom additions', 'Active queue', 'Question styles']
  },
  {
    title: 'Session Tracking',
    description: 'Monitor session duration, dialogue flow, and automatically trigger question generation based on conversation patterns.',
    capabilities: ['Duration tracking', 'Auto-generation', 'Flow analysis', 'Session management']
  },
  {
    title: 'Export & Analysis',
    description: 'Download complete session transcripts in CSV or TXT format with timestamps, speaker identification, and metadata.',
    capabilities: ['CSV/TXT export', 'Timestamps', 'Speaker tags', 'Session metadata']
  }
];

const stats = [
  { number: '3+', label: 'AI Models', subtitle: 'ChatGPT, Claude, Gemini' },
  { number: '12+', label: 'Languages', subtitle: 'Global coaching support' },
  { number: '∞', label: 'Questions', subtitle: 'Unlimited generation' },
  { number: '100%', label: 'Real-time', subtitle: 'Live transcription' }
];

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>Executive Coaching Assistant - AI-Powered Coaching Support</title>
        <meta name="description" content="Transform your coaching sessions with real-time AI insights and automatic transcription. Focus on breakthroughs, not note-taking." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Hero Section */}
      <HeroSection>
        <Container maxWidth="lg">
          {/* Badge */}
          <Chip 
            label="AI-POWERED COACHING" 
            sx={{ 
              mb: 6,
              backgroundColor: colors.black,
              color: colors.white,
              fontSize: '0.9rem',
              fontWeight: 500,
              letterSpacing: '0.5px',
              padding: '8px 16px',
              height: 'auto'
            }} 
          />
          
          {/* Main Heading */}
          <Typography 
            variant="h1" 
            sx={{ 
              fontSize: { xs: '3rem', md: '5rem', lg: '6rem' },
              fontWeight: 300,
              letterSpacing: '-0.02em',
              lineHeight: 0.9,
              color: colors.black,
              mb: 4
            }}
          >
            Executive
            <br />
            <Box component="span" sx={{ fontWeight: 200, color: colors.gray[600] }}>
              Coaching
            </Box>
            <br />
            <Box component="span" sx={{ fontWeight: 500 }}>
              Redefined
            </Box>
          </Typography>
          
          {/* Subtitle */}
          <Typography 
            variant="h5" 
            sx={{ 
              fontSize: { xs: '1.5rem', md: '2rem' },
              fontWeight: 300,
              color: colors.gray[600],
              mb: 8,
              maxWidth: '800px',
              mx: 'auto',
              lineHeight: 1.4
            }}
          >
            Transform your coaching sessions with real-time AI insights and automatic transcription.
            <br />
            Focus on breakthroughs, not note-taking.
          </Typography>
          
          {/* CTA Button */}
          <Link href="/coaching4" passHref>
            <AppleButton
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              sx={{
                backgroundColor: colors.black,
                color: colors.white,
                mb: 12,
                '&:hover': {
                  backgroundColor: colors.gray[800],
                }
              }}
            >
              Start Session
            </AppleButton>
          </Link>

          {/* Stats Grid */}
          <Grid container spacing={4} sx={{ maxWidth: '800px', mx: 'auto' }}>
            {stats.map((stat, index) => (
              <Grid item xs={6} md={3} key={stat.label}>
                <StatsCard>
                  <Typography 
                    variant="h3" 
                    sx={{ 
                      fontWeight: 300, 
                      color: colors.black,
                      mb: 1,
                      fontSize: { xs: '2.5rem', md: '3rem' }
                    }}
                  >
                    {stat.number}
                  </Typography>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 500, 
                      color: colors.black,
                      mb: 0.5
                    }}
                  >
                    {stat.label}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: colors.gray[500],
                      fontWeight: 300
                    }}
                  >
                    {stat.subtitle}
                  </Typography>
                </StatsCard>
              </Grid>
            ))}
          </Grid>
        </Container>
      </HeroSection>

      {/* Features Section */}
      <GraySection>
        <Container maxWidth="lg">
          {/* Section Header */}
          <Box sx={{ textAlign: 'center', mb: 10 }}>
            <Typography 
              variant="h2" 
              sx={{ 
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                fontWeight: 300,
                color: colors.black,
                mb: 3,
                letterSpacing: '-0.01em'
              }}
            >
              Everything you need.
              <br />
              <Box component="span" sx={{ color: colors.gray[600] }}>
                Nothing you don't.
              </Box>
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 300,
                color: colors.gray[600],
                maxWidth: '600px',
                mx: 'auto',
                fontSize: '1.5rem',
                lineHeight: 1.4
              }}
            >
              Six essential features that transform how you coach.
              <br />
              Simple. Powerful. Intelligent.
            </Typography>
          </Box>

          {/* Features Grid */}
          <Grid container spacing={6}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={6} key={feature.title}>
                <FeatureCard>
                  <CardContent>
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        fontWeight: 300,
                        color: colors.black,
                        mb: 3,
                        fontSize: { xs: '1.8rem', md: '2.2rem' },
                        letterSpacing: '-0.01em'
                      }}
                    >
                      {feature.title}
                    </Typography>
                    
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: colors.gray[600],
                        mb: 4,
                        fontWeight: 300,
                        fontSize: '1.1rem',
                        lineHeight: 1.6
                      }}
                    >
                      {feature.description}
                    </Typography>
                    
                    <Box>
                      {feature.capabilities.map((capability, idx) => (
                        <Box 
                          key={idx}
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            mb: 1
                          }}
                        >
                          <Box 
                            sx={{ 
                              width: 4,
                              height: 4,
                              backgroundColor: colors.black,
                              borderRadius: '50%',
                              mr: 2
                            }}
                          />
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: colors.gray[500],
                              fontWeight: 300
                            }}
                          >
                            {capability}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </FeatureCard>
              </Grid>
            ))}
          </Grid>
        </Container>
      </GraySection>

      {/* How It Works Section */}
      <Box sx={{ py: 12, backgroundColor: colors.white }}>
        <Container maxWidth="lg">
          <Typography 
            variant="h2" 
            sx={{ 
              fontSize: { xs: '2.5rem', md: '3.5rem' },
              fontWeight: 300,
              color: colors.black,
              textAlign: 'center',
              mb: 10,
              letterSpacing: '-0.01em'
            }}
          >
            Three steps to better coaching.
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Step 1 */}
            <StepBox>
              <Grid container spacing={6} alignItems="center">
                <Grid item xs={12} md={6}>
                  <Typography 
                    variant="h1" 
                    sx={{ 
                      fontSize: { xs: '6rem', md: '8rem' },
                      fontWeight: 100,
                      color: colors.gray[200],
                      lineHeight: 0.8,
                      mb: 2
                    }}
                  >
                    01
                  </Typography>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 300,
                      color: colors.black,
                      mb: 3,
                      letterSpacing: '-0.01em'
                    }}
                  >
                    Connect
                  </Typography>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 300,
                      color: colors.gray[600],
                      lineHeight: 1.5
                    }}
                  >
                    Set up your AI model, configure language preferences, and connect your audio sources. 
                    Works with microphone or system audio for remote sessions.
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box 
                    sx={{ 
                      width: '100%',
                      height: 250,
                      backgroundColor: colors.gray[100],
                      borderRadius: '24px'
                    }}
                  />
                </Grid>
              </Grid>
            </StepBox>
            
            {/* Step 2 */}
            <StepBox>
              <Grid container spacing={6} alignItems="center">
                <Grid item xs={12} md={6} sx={{ order: { xs: 2, md: 2 } }}>
                  <Typography 
                    variant="h1" 
                    sx={{ 
                      fontSize: { xs: '6rem', md: '8rem' },
                      fontWeight: 100,
                      color: colors.gray[200],
                      lineHeight: 0.8,
                      mb: 2
                    }}
                  >
                    02
                  </Typography>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 300,
                      color: colors.black,
                      mb: 3,
                      letterSpacing: '-0.01em'
                    }}
                  >
                    Coach
                  </Typography>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 300,
                      color: colors.gray[600],
                      lineHeight: 1.5
                    }}
                  >
                    Start your session with real-time transcription. AI listens, understands context, 
                    and automatically generates relevant coaching questions.
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6} sx={{ order: { xs: 1, md: 1 } }}>
                  <Box 
                    sx={{ 
                      width: '100%',
                      height: 250,
                      backgroundColor: colors.gray[100],
                      borderRadius: '24px'
                    }}
                  />
                </Grid>
              </Grid>
            </StepBox>
            
            {/* Step 3 */}
            <StepBox>
              <Grid container spacing={6} alignItems="center">
                <Grid item xs={12} md={6}>
                  <Typography 
                    variant="h1" 
                    sx={{ 
                      fontSize: { xs: '6rem', md: '8rem' },
                      fontWeight: 100,
                      color: colors.gray[200],
                      lineHeight: 0.8,
                      mb: 2
                    }}
                  >
                    03
                  </Typography>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 300,
                      color: colors.black,
                      mb: 3,
                      letterSpacing: '-0.01em'
                    }}
                  >
                    Export
                  </Typography>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 300,
                      color: colors.gray[600],
                      lineHeight: 1.5
                    }}
                  >
                    Download complete session transcripts with timestamps and speaker identification. 
                    Review insights and prepare for follow-up sessions.
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box 
                    sx={{ 
                      width: '100%',
                      height: 250,
                      backgroundColor: colors.gray[100],
                      borderRadius: '24px'
                    }}
                  />
                </Grid>
              </Grid>
            </StepBox>
          </Box>
        </Container>
      </Box>

      {/* CTA Section */}
      <BlackSection>
        <Container maxWidth="md">
          <Typography 
            variant="h2" 
            sx={{ 
              fontSize: { xs: '2.5rem', md: '4rem' },
              fontWeight: 300,
              mb: 4,
              letterSpacing: '-0.01em'
            }}
          >
            Ready to transform
            <br />
            your coaching?
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: colors.gray[300],
              mb: 6,
              fontWeight: 300,
              maxWidth: '600px',
              mx: 'auto',
              lineHeight: 1.5
            }}
          >
            Join the next generation of executive coaches leveraging AI for more impactful, 
            insightful coaching experiences.
          </Typography>
          
          <Link href="/coaching4" passHref>
            <AppleButton
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              sx={{
                backgroundColor: colors.white,
                color: colors.black,
                mb: 6,
                '&:hover': {
                  backgroundColor: colors.gray[100],
                }
              }}
            >
              Start Free Session
            </AppleButton>
          </Link>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 3 }}>
            {['No credit card required', 'Instant setup', 'All features included'].map((text, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                <Box 
                  sx={{ 
                    width: 4,
                    height: 4,
                    backgroundColor: colors.gray[400],
                    borderRadius: '50%',
                    mr: 1
                  }}
                />
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: colors.gray[400],
                    fontWeight: 300
                  }}
                >
                  {text}
                </Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </BlackSection>

      {/* Footer */}
      <Box sx={{ py: 8, backgroundColor: colors.white, borderTop: `1px solid ${colors.gray[100]}` }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center' }}>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 300,
                color: colors.black,
                mb: 2,
                letterSpacing: '-0.01em'
              }}
            >
              Executive Coaching Assistant
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: colors.gray[500],
                mb: 3,
                fontWeight: 300
              }}
            >
              Empowering coaches with AI-driven insights and real-time support.
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: colors.gray[400],
                fontWeight: 300
              }}
            >
              © {new Date().getFullYear()} Executive Coaching Assistant. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </>
  );
}
