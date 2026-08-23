import './globals.css';

export const metadata = {
  title: 'VoiceRAG - Native Multimodal Audio RAG',
  description: 'Native audio question answering using Gemini Embedding 2, Qdrant vector database, and Multimodal LLMs.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}
