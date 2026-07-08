import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateFormField, autoFillForm, resetForm } from './redux/formSlice';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import html2pdf from 'html2pdf.js'; // PDF Export Library
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'; // Analytics Library

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// Dummy Analytics Data
const analyticsData = [
  { name: 'Positive', value: 12 },
  { name: 'Neutral', value: 5 },
  { name: 'Negative', value: 2 },
];
const COLORS = ['#10b981', '#f59e0b', '#ef4444']; // Green, Yellow, Red

function App() {
  const dispatch = useDispatch();
  const formData = useSelector((state) => state.form);
  
  const [chatInput, setChatInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false); // Dark Mode State
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hello! You can type or use the mic 🎤 to log your HCP interaction.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  // Toggle Dark Mode
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    dispatch(updateFormField({ field: name, value }));
  };

  const handleListen = () => {
    if (!SpeechRecognition) {
      toast.error("Your browser doesn't support voice recognition.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setChatInput((prev) => prev + (prev ? " " : "") + transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleReset = () => {
    dispatch(resetForm());
    setMessages([{ sender: 'ai', text: 'Form cleared. Ready for a new interaction!' }]);
    setChatInput('');
    toast.success("Ready for new interaction!");
  };

  // PDF Export Feature
  const handleExportPDF = () => {
    const element = document.getElementById('report-content');
    const opt = {
      margin: 0.5,
      filename: `HCP_Interaction_${formData.hcpName || 'Report'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
    toast.success("PDF Downloaded Successfully! 📄");
  };

  const handleChatSubmit = async (e) => {
    if(e) e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    const newMessages = [...messages, { sender: 'user', text: userText }];
    setMessages(newMessages);
    setChatInput('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/chat', { message: userText });
      let aiText = response.data.reply || '';

      const jsonRegex = new RegExp("```(?:json)?\\s*([\\s\\S]*?)\\s*```", "i");
      const match = aiText.match(jsonRegex);

      if (match && match[1]) {
        try {
          const extractedData = JSON.parse(match[1]);
          const now = new Date();
          
          dispatch(autoFillForm({
            hcpName: extractedData.hcpName || formData.hcpName || '',
            topics: extractedData.topics || formData.topics || '',
            sentiment: extractedData.sentiment || formData.sentiment || 'Neutral',
            actions: extractedData.actions || formData.actions || '',
            date: now.toISOString().split('T')[0],
            time: now.toTimeString().slice(0, 5)
          }));
          
          aiText = aiText.replace(jsonRegex, '').trim();
          if (aiText === '') aiText = "Interaction logged and form updated successfully!";
          toast.success("AI updated the form!");

        } catch (error) {
          console.error("Parse Error:", error);
        }
      } else if (aiText.trim() === '') {
         aiText = "Action completed successfully.";
      }

      setMessages([...newMessages, { sender: 'ai', text: aiText }]);
    } catch (error) {
      toast.error("Could not connect to AI backend.");
      setMessages([...newMessages, { sender: 'ai', text: 'Error connecting to server.' }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveForm = async () => {
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/save_log', formData);
      toast.success(response.data.message || "Data saved to database! 🚀");
    } catch (error) {
      toast.error("Error saving data to database.");
    }
  };

  return (
    <div className="min-h-screen transition-colors duration-300 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-gray-900 p-4 md:p-8 font-sans text-slate-800 dark:text-gray-100">
      <Toaster position="top-right" /> 
      
      {/* HEADER SECTION */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">AI-First CRM</h1>
        <div className="flex gap-3">
          {/* Dark Mode Toggle */}
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 px-4 py-2 rounded-full shadow-sm hover:shadow-md transition flex items-center gap-2">
            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
          
          {/* Export to PDF Button */}
          <button onClick={handleExportPDF} className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 px-4 py-2 rounded-full shadow-sm hover:shadow-md transition flex items-center gap-2">
            📄 Export PDF
          </button>
          
          {/* New Interaction Button */}
          <button onClick={handleReset} className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 px-4 py-2 rounded-full shadow-sm hover:shadow-md transition flex items-center gap-2">
            🔄 Clear
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: INTERACTION FORM & ANALYTICS */}
        <div className="md:col-span-2 space-y-6">
          
          {/* FORM CARD (ID added for PDF Export) */}
          <div id="report-content" className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white dark:border-slate-700">
            <h2 className="text-xl font-semibold mb-6">Interaction Details</h2>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1">HCP Name</label>
                  <input type="text" name="hcpName" value={formData.hcpName} onChange={handleChange} className="w-full bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-400 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select name="interactionType" value={formData.interactionType} onChange={handleChange} className="w-full bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-400 transition">
                    <option>Meeting</option>
                    <option>Call</option>
                    <option>Email</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-400 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Time</label>
                  <input type="time" name="time" value={formData.time} onChange={handleChange} className="w-full bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-400 transition" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Topics Discussed</label>
                <textarea name="topics" value={formData.topics} onChange={handleChange} rows="3" className="w-full bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-400 transition"></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Inferred Sentiment</label>
                <div className="flex gap-6">
                  {['Positive', 'Neutral', 'Negative'].map((sent) => (
                    <label key={sent} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="sentiment" value={sent} checked={formData.sentiment === sent} onChange={handleChange} className="text-indigo-600 focus:ring-indigo-500 h-4 w-4" />
                      <span className="text-sm font-medium">{sent}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Follow-up Actions</label>
                <textarea name="actions" value={formData.actions} onChange={handleChange} rows="2" className="w-full bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-400 transition"></textarea>
              </div>

              <button onClick={handleSaveForm} className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98]">
                Save Interaction Log
              </button>
            </div>
          </div>

          {/* MINI ANALYTICS DASHBOARD CARD */}
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white dark:border-slate-700 flex flex-col md:flex-row items-center justify-between">
            <div>
              <h3 className="text-lg font-bold mb-2">Sentiment Overview</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">A quick breakdown of recent interactions logged in the CRM database.</p>
            </div>
            <div className="w-full md:w-64 h-40 mt-4 md:mt-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analyticsData} innerRadius={35} outerRadius={60} paddingAngle={5} dataKey="value">
                    {analyticsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={20} iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AI CHAT ASSISTANT */}
        <div className="md:col-span-1 bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg rounded-2xl shadow-xl border border-white dark:border-slate-700 flex flex-col h-[85vh]">
          <div className="p-5 border-b border-gray-100 dark:border-slate-700 bg-white/40 dark:bg-slate-800/40 rounded-t-2xl flex items-center gap-3">
            <div className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-full text-xl">🤖</div>
            <div>
              <h2 className="font-bold">AI Assistant</h2>
              <p className="text-xs font-medium text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> Online
              </p>
            </div>
          </div>

          <div className="flex-1 p-5 overflow-y-auto space-y-5">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-3.5 text-sm shadow-sm whitespace-pre-wrap ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 rounded-bl-sm'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 rounded-2xl rounded-bl-sm p-4 shadow-sm flex gap-1.5 items-center">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-white/40 dark:bg-slate-800/40 rounded-b-2xl">
            <form onSubmit={handleChatSubmit} className="flex gap-2 items-center bg-white dark:bg-slate-700 p-1 rounded-xl shadow-inner border border-gray-200 dark:border-slate-600">
              <button type="button" onClick={handleListen} className={`p-2 rounded-lg transition-colors ${isListening ? 'bg-red-100 dark:bg-red-900/50 text-red-600 animate-pulse' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-600'}`}>
                🎙️
              </button>
              
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type or speak..." className="flex-1 bg-transparent p-2 text-sm outline-none placeholder-gray-400" disabled={isLoading} />
              
              <button type="submit" disabled={isLoading} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">
                Send
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;