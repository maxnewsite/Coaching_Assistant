import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

const features = [
  {
    icon: '•',
    title: 'Real-Time Transcription',
    description: 'Capture every word with Azure-powered speech recognition for both coach and coachee, with speaking indicators and multi-language support.',
    capabilities: ['Live transcription', 'Speaker detection', 'Multi-language', 'High accuracy']
  },
  {
    icon: '•',
    title: 'System Audio Capture',
    description: 'Perfect for remote coaching sessions - capture audio directly from video calls and online meetings with seamless integration.',
    capabilities: ['Remote sessions', 'Video call audio', 'Screen sharing', 'Tab audio capture']
  },
  {
    icon: '•',
    title: 'AI Question Generation',
    description: 'Intelligent coaching questions generated in real-time based on conversation context using ChatGPT, Claude, or Gemini AI models.',
    capabilities: ['Context-aware', 'Multiple AI models', 'Custom prompts', 'Smart timing']
  },
  {
    icon: '•',
    title: 'Question Management',
    description: 'Curated library of powerful coaching questions with ability to activate, customize, and manage your question toolkit.',
    capabilities: ['Pre-loaded questions', 'Custom additions', 'Active queue', 'Question styles']
  },
  {
    icon: '•',
    title: 'Session Tracking',
    description: 'Monitor session duration, dialogue flow, and automatically trigger question generation based on conversation patterns.',
    capabilities: ['Duration tracking', 'Auto-generation', 'Flow analysis', 'Session management']
  },
  {
    icon: '•',
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

      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="relative bg-white">
          <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
            <div className="text-center">
              {/* Badge */}
              <div className="inline-block px-4 py-2 rounded-full bg-black text-white text-sm font-medium mb-12 tracking-wide">
                AI-POWERED COACHING
              </div>
              
              {/* Main Heading */}
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-black mb-8 leading-[0.9]">
                Executive
                <br />
                <span className="font-extralight text-gray-600">Coaching</span>
                <br />
                <span className="font-medium">Redefined</span>
              </h1>
              
              {/* Subtitle */}
              <p className="text-2xl md:text-3xl text-gray-600 mb-16 max-w-4xl mx-auto leading-relaxed font-light">
                Transform your coaching sessions with real-time AI insights and automatic transcription.
                <br />
                Focus on breakthroughs, not note-taking.
              </p>
              
              {/* CTA Button */}
              <Link href="/coaching4" passHref>
                <button className="inline-flex items-center px-12 py-4 text-lg font-medium text-white bg-black rounded-full hover:bg-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] mb-24">
                  Start Session
                  <svg className="ml-3 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </Link>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
                {stats.map((stat, index) => (
                  <div
                    key={stat.label}
                    className="group"
                  >
                    <div className="text-4xl md:text-5xl font-light text-black mb-2 tracking-tight">
                      {stat.number}
                    </div>
                    <div className="text-xl font-medium text-black mb-1 tracking-wide">
                      {stat.label}
                    </div>
                    <div className="text-base text-gray-500 font-light">
                      {stat.subtitle}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-gray-50">
          <div className="max-w-6xl mx-auto px-6">
            {/* Section Header */}
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-light text-black mb-6 tracking-tight">
                Everything you need.
                <br />
                <span className="text-gray-600">Nothing you don't.</span>
              </h2>
              <p className="text-2xl text-gray-600 max-w-3xl mx-auto font-light leading-relaxed">
                Six essential features that transform how you coach.
                <br />
                Simple. Powerful. Intelligent.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className="group"
                >
                  {/* Title */}
                  <h3 className="text-2xl md:text-3xl font-light text-black mb-6 tracking-tight">
                    {feature.title}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-gray-600 mb-8 leading-relaxed font-light text-xl">
                    {feature.description}
                  </p>
                  
                  {/* Capabilities */}
                  <div className="space-y-2">
                    {feature.capabilities.map((capability, idx) => (
                      <div
                        key={idx}
                        className="flex items-center text-base text-gray-500 font-light"
                      >
                        <div className="w-1 h-1 bg-black rounded-full mr-3"></div>
                        {capability}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-4xl md:text-5xl font-light text-black text-center mb-20 tracking-tight">
              Three steps to better coaching.
            </h2>
            
            <div className="space-y-16 md:space-y-24">
              {/* Step 1 */}
              <div className="flex flex-col md:flex-row items-center gap-12">
                <div className="flex-1">
                  <div className="text-8xl md:text-9xl font-ultralight text-gray-200 mb-4">01</div>
                  <h3 className="text-3xl font-light text-black mb-6 tracking-tight">Connect</h3>
                  <p className="text-2xl text-gray-600 leading-relaxed font-light">
                    Set up your AI model, configure language preferences, and connect your audio sources. 
                    Works with microphone or system audio for remote sessions.
                  </p>
                </div>
                <div className="flex-1">
                  <div className="w-full h-64 bg-gray-100 rounded-3xl"></div>
                </div>
              </div>
              
              {/* Step 2 */}
              <div className="flex flex-col md:flex-row-reverse items-center gap-12">
                <div className="flex-1">
                  <div className="text-8xl md:text-9xl font-ultralight text-gray-200 mb-4">02</div>
                  <h3 className="text-3xl font-light text-black mb-6 tracking-tight">Coach</h3>
                  <p className="text-2xl text-gray-600 leading-relaxed font-light">
                    Start your session with real-time transcription. AI listens, understands context, 
                    and automatically generates relevant coaching questions.
                  </p>
                </div>
                <div className="flex-1">
                  <div className="w-full h-64 bg-gray-100 rounded-3xl"></div>
                </div>
              </div>
              
              {/* Step 3 */}
              <div className="flex flex-col md:flex-row items-center gap-12">
                <div className="flex-1">
                  <div className="text-8xl md:text-9xl font-ultralight text-gray-200 mb-4">03</div>
                  <h3 className="text-3xl font-light text-black mb-6 tracking-tight">Export</h3>
                  <p className="text-2xl text-gray-600 leading-relaxed font-light">
                    Download complete session transcripts with timestamps and speaker identification. 
                    Review insights and prepare for follow-up sessions.
                  </p>
                </div>
                <div className="flex-1">
                  <div className="w-full h-64 bg-gray-100 rounded-3xl"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-black text-white">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-4xl md:text-6xl font-light mb-8 tracking-tight">
              Ready to transform
              <br />
              your coaching?
            </h2>
            <p className="text-2xl text-gray-300 mb-12 leading-relaxed font-light max-w-2xl mx-auto">
              Join the next generation of executive coaches leveraging AI for more impactful, 
              insightful coaching experiences.
            </p>
            
            <Link href="/coaching4" passHref>
              <button className="inline-flex items-center px-12 py-4 text-lg font-medium text-black bg-white rounded-full hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] mb-12">
                Start Free Session
                <svg className="ml-3 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </Link>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-400 font-light">
              <div className="flex items-center">
                <div className="w-1 h-1 bg-gray-400 rounded-full mr-2"></div>
                No credit card required
              </div>
              <div className="flex items-center">
                <div className="w-1 h-1 bg-gray-400 rounded-full mr-2"></div>
                Instant setup
              </div>
              <div className="flex items-center">
                <div className="w-1 h-1 bg-gray-400 rounded-full mr-2"></div>
                All features included
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-16 bg-white border-t border-gray-100">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <h3 className="text-2xl font-light text-black mb-4 tracking-tight">
              Executive Coaching Assistant
            </h3>
            <p className="text-gray-500 mb-6 font-light text-lg">
              Empowering coaches with AI-driven insights and real-time support.
            </p>
            <p className="text-gray-400 text-base font-light">
              © {new Date().getFullYear()} Executive Coaching Assistant. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
