
import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import MermaidDiagram from './MermaidDiagram';

interface MessageContentProps {
  content: string;
  sender: 'user' | 'agent';
}

const MessageContent = ({ content, sender }: MessageContentProps) => {
  // Process code blocks
  const processedContent = content.split('```').map((part, i) => {
    // Even indices are regular text, odd indices are code blocks
    if (i % 2 === 0) {
      return part;
    } else {
      // Extract the language and code
      const firstLineBreak = part.indexOf('\n');
      const language = firstLineBreak > 0 ? part.substring(0, firstLineBreak).trim() : '';
      const code = firstLineBreak > 0 ? part.substring(firstLineBreak + 1) : part;
      
      // Handle Mermaid diagrams
      if (language === 'mermaid') {
        return (
          <MermaidDiagram 
            key={i} 
            code={code} 
            id={`mermaid-${i}-${Date.now()}`}
          />
        );
      }
      
      // Handle regular code
      return (
        <SyntaxHighlighter 
          key={i}
          language={language || 'javascript'} 
          style={vscDarkPlus}
          className="rounded-md my-2"
        >
          {code}
        </SyntaxHighlighter>
      );
    }
  });

  // Create React elements for the processed content
  const elements = processedContent.map((part, i) => {
    if (typeof part === 'string') {
      // Process text parts for formatting
      return (
        <div key={i} className="whitespace-pre-wrap">
          {part.split('\n').map((line, j) => {
            // Handle headings
            if (line.startsWith('# ')) {
              return <h1 key={j} className="text-xl font-bold mt-4 mb-2">{line.substring(2)}</h1>;
            } else if (line.startsWith('## ')) {
              return <h2 key={j} className="text-lg font-bold mt-3 mb-2">{line.substring(3)}</h2>;
            } else if (line.startsWith('### ')) {
              return <h3 key={j} className="text-base font-bold mt-2 mb-1">{line.substring(4)}</h3>;
            } 
            // Handle blockquotes
            else if (line.startsWith('> ')) {
              return <blockquote key={j} className="border-l-4 border-gray-300 pl-4 italic my-2">{line.substring(2)}</blockquote>;
            }
            // Handle list items
            else if (line.startsWith('- ')) {
              return <li key={j} className="ml-4">{line.substring(2)}</li>;
            } else if (line.match(/^\d+\. /)) {
              const num = line.match(/^\d+/)![0];
              return <li key={j} className="ml-8 list-decimal">{line.substring(num.length + 2)}</li>;
            }
            // Handle tables, bold, italic, and links would go here
            
            // Regular line
            else {
              return <p key={j} className={j > 0 ? "mt-2" : ""}>{line}</p>;
            }
          })}
        </div>
      );
    } else {
      // Return already processed React elements (syntax highlighted code or diagrams)
      return part;
    }
  });

  return <>{elements}</>;
};

export default MessageContent;
