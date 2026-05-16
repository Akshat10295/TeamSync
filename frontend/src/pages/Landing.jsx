import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Zap, Play, ArrowRight } from 'lucide-react';

export default function LandingPage({ session }) {
  const navigate = useNavigate();

  // If user clicks getting started and they are already logged in, the Auth page will handle the session
  // seamlessly with the 'Continue to Dashboard' popup as we built earlier!
  const handleGetStarted = () => {
    navigate('/login?mode=signup');
  };

  const handleSignIn = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#0d0c13] text-white overflow-hidden font-sans relative flex flex-col">
      {/* Background Animated Blobs for depth */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-900 rounded-full mix-blend-screen filter blur-[150px] opacity-30"
        />
        <motion.div 
          animate={{ x: [0, -50, 0], y: [0, 40, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-900 rounded-full mix-blend-screen filter blur-[120px] opacity-20"
        />
      </div>

      {/* Navigation Bar */}
      <nav className="relative z-10 max-w-6xl mx-auto w-full px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Users className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">TeamSync</span>
        </div>
        <div className="flex items-center gap-8">
          {!session && (
            <button 
              onClick={handleSignIn}
              className="text-sm font-medium text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              Sign In
            </button>
          )}
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={session ? () => navigate('/dashboard') : handleGetStarted}
            className="text-sm font-bold bg-white text-black px-6 py-2.5 rounded-full shadow-xl cursor-pointer hover:bg-gray-200 transition-all"
          >
            {session ? 'Go to Dashboard' : 'Get Started'}
          </motion.button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-6 flex-1 flex flex-col justify-center items-center text-center py-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Real-Time Collaboration <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-purple-500 to-blue-500 filter drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]">
              Built for Student Teams
            </span>
          </h1>
          
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-12">
            Track work automatically, collaborate in real-time, and never lose data. 
            The perfect workspace for student projects.
          </p>

          <div className="flex justify-center">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={session ? () => navigate('/dashboard') : handleGetStarted}
              className="group flex items-center gap-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold px-10 py-5 rounded-full shadow-[0_0_50px_rgba(168,85,247,0.4)] transition-all cursor-pointer text-xl"
            >
              {session ? 'Launch Dashboard' : 'Get Started for Free'}
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </div>
        </motion.div>
        
        {/* Abstract mock browser / app UI window preview at the bottom */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-20 w-full max-w-4xl relative"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0c13] via-transparent to-transparent z-10 pointer-events-none" />
          <div className="h-[300px] w-full rounded-t-3xl border border-white/10 bg-[#16141c] overflow-hidden shadow-2xl relative">
            <div className="h-10 border-b border-white/10 flex items-center px-4 gap-2 bg-white/[0.02]">
              <div className="w-3 h-3 rounded-full bg-red-400/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
              <div className="w-3 h-3 rounded-full bg-green-400/80" />
            </div>
            {/* Fake skeleton UI elements */}
            <div className="p-6 flex gap-6">
              <div className="w-1/4 space-y-4">
                <div className="h-4 bg-white/5 rounded-full w-3/4" />
                <div className="h-4 bg-white/5 rounded-full w-full" />
                <div className="h-4 bg-white/5 rounded-full w-5/6" />
                <div className="h-4 bg-white/5 rounded-full w-full" />
              </div>
              <div className="w-3/4 space-y-6 flex flex-col pt-4">
                <div className="h-32 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-white/5 rounded-2xl w-full" />
                <div className="flex gap-4">
                  <div className="h-24 bg-white/5 rounded-xl flex-1" />
                  <div className="h-24 bg-white/5 rounded-xl flex-1" />
                  <div className="h-24 bg-white/5 rounded-xl flex-1" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
