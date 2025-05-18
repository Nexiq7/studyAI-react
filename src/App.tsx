import React, { useState } from 'react';

const API_BASE =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3001'
    : 'https://studyai-express.onrender.com';

type Flashcard = {
  front: string;
  back: string;
};

type QuizQuestion = {
  question: string;
  options: string[];
  answer: string;
};

type AIResponse = {
  summary: string;
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  suggestedQuestions: string[]; // New: suggested chat questions from backend
};

type Message = {
  role: 'user' | 'bot';
  text: string;
};

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<AIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flipped, setFlipped] = useState<number[]>([]);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  };

  const handleSubmit = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Something went wrong');
      }

      const result: AIResponse = await response.json();
      setData(result);
      setFlipped([]); // Reset flipped cards on new data

      // Reset chat messages for new document
      setMessages([
        { role: 'bot', text: 'Hi! Ask me any question about your notes or pick a suggested question below.' },
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleFlip = (index: number) => {
    setFlipped((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const resetApp = () => {
    setData(null);
    setFile(null);
    setError(null);
    setFlipped([]);
    setMessages([]);
    setInput('');
  };

  // Chat: send a question to backend and get answer
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    setMessages((msgs) => [...msgs, { role: 'user', text }]);
    setInput('');
    setChatLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      });

      console.log('Chat response:', response);

      if (!response.ok) {
        throw new Error('Failed to get chat response');
      }

      const data = await response.json();
      setMessages((msgs) => [...msgs, { role: 'bot', text: data.answer }]);
    } catch (err: any) {
      setMessages((msgs) => [...msgs, { role: 'bot', text: `Error: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Handler for suggested questions click
  const onSuggestedQuestionClick = (question: string) => {
    sendMessage(question);
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 flex flex-col justify-center items-center p-6 text-gray-800">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-10 text-center">
          <h1 className="text-4xl font-extrabold mb-4 text-indigo-700 drop-shadow-md">
            📚 StudyAI
          </h1>
          <p className="text-gray-600 mb-8">
            Upload your class notes and get smart quizzes, flashcards, and summaries instantly!
          </p>

          <input
            type="file"
            accept=".txt, .pdf"
            onChange={handleFileChange}
            className="mb-4 w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-indigo-600 file:text-white
              hover:file:bg-indigo-700
              cursor-pointer
              transition"
          />

          <button
            onClick={handleSubmit}
            disabled={loading || !file}
            className="w-full bg-indigo-600 text-white py-3 rounded-full text-lg font-semibold
              hover:bg-indigo-700
              disabled:opacity-50 disabled:cursor-not-allowed
              transition"
          >
            {loading ? 'Analyzing...' : 'Analyze Notes'}
          </button>

          {error && (
            <p className="text-red-600 mt-4 font-medium">{error}</p>
          )}

          <p className="mt-6 text-xs text-gray-400 italic">
            Only .txt and .pdf files supported for now.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-gray-800 flex flex-col max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-6">📚 StudyAI</h1>

      <section className="bg-white p-6 rounded shadow mb-6">
        <h2 className="text-2xl font-semibold mb-2">🧠 Summary</h2>
        <p>{data.summary}</p>
      </section>

      <section className="bg-white p-6 rounded shadow mb-6">
        <h2 className="text-2xl font-semibold mb-2">🃏 Flashcards</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.flashcards.map((card, idx) => (
            <div
              key={idx}
              onClick={() => toggleFlip(idx)}
              className="cursor-pointer rounded-lg p-6 shadow text-center transition-transform duration-300 hover:scale-105 bg-indigo-50"
            >
              <p className="font-medium text-lg">
                {flipped.includes(idx) ? card.back : card.front}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white p-6 rounded shadow mb-6">
        <h2 className="text-2xl font-semibold mb-2">❓ Quiz</h2>
        <div className="space-y-4">
          {data.quiz.map((q, idx) => (
            <div key={idx} className="rounded p-4 shadow bg-indigo-50">
              <p className="font-semibold">{q.question}</p>
              <ul className="list-disc ml-6">
                {q.options.map((opt, i) => (
                  <li key={i}>{opt}</li>
                ))}
              </ul>
              <p className="italic mt-1 text-sm text-green-600">
                Answer: {q.answer}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Chat Section */}
      <section className="bg-white p-6 rounded shadow flex flex-col max-h-[400px]">
        <h2 className="text-2xl font-semibold mb-2">💬 Chat with StudyBot</h2>

        {/* Suggested questions */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {data.suggestedQuestions?.map((q, i) => (
              <button
                key={i}
                onClick={() => onSuggestedQuestionClick(q)}
                className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm hover:bg-indigo-700 transition"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto mb-4 border rounded p-4 bg-gray-100">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-2 w-full p-2 rounded ${msg.role === 'bot'
                ? 'bg-indigo-200 self-start'
                : 'bg-indigo-600 text-white self-end'
                }`}
              style={{ alignSelf: msg.role === 'bot' ? 'flex-start' : 'flex-end' }}
            >
              {msg.text}
            </div>
          ))}
          {chatLoading && (
            <div className="text-gray-500 italic">StudyBot is typing...</div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            className="flex-grow rounded border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={chatLoading}
          />
          <button
            type="submit"
            disabled={chatLoading || !input.trim()}
            className="bg-indigo-600 text-white px-4 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Send
          </button>
        </form>
      </section>

      <div className="text-center mt-8">
        <button
          onClick={resetApp}
          className="bg-red-600 text-white py-3 px-8 rounded-full text-lg font-semibold hover:bg-red-700 transition"
        >
          Analyze Another Document
        </button>
      </div>
    </div>
  );
}

export default App;
