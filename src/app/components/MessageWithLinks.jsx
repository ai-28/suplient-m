"use client"

import React from 'react';

// Component to render message text with clickable links
// Parses markdown-style links: [text](url) and renders only the text as clickable
export function MessageWithLinks({ messageText, className = "" }) {
  if (!messageText) return null;
  
  // Convert to string if it's not already
  const text = String(messageText);
  
  // Match markdown-style links: [text](url)
  // Updated regex to handle URLs with parentheses and special characters
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let keyCounter = 0;
  
  // Reset regex lastIndex to avoid issues with global regex
  linkRegex.lastIndex = 0;
  
  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Capture URL and text in variables to avoid closure issues
    const linkUrl = match[2];
    const linkText = match[1];
    
    // Add clickable link - only show the text part, URL is hidden
    parts.push(
      <a
        key={`link-${keyCounter++}`}
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 dark:text-blue-400 underline hover:text-blue-600 dark:hover:text-blue-300 font-medium cursor-pointer break-all"
        onClick={(e) => {
          e.preventDefault();
          if (linkUrl) {
            window.open(linkUrl, '_blank', 'noopener,noreferrer');
          }
        }}
      >
        {linkText}
      </a>
    );
    
    lastIndex = linkRegex.lastIndex;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  // If no links found, return plain text
  // Note: Parent element should have whitespace-pre-wrap class
  if (parts.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Return the parts array wrapped in a span
  // The parent element's whitespace-pre-wrap will preserve formatting
  return <span className={className}>{parts}</span>;
}

