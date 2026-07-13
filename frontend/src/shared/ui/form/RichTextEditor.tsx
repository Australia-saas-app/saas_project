"use client";


import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, List, ListOrdered, Underline } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  dir?: 'ltr' | 'rtl';
}

export function RichTextEditor({ 
  value = "", 
  onChange, 
  //placeholder = "Enter your description...",
  className = "",
  dir = 'ltr'
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const lastPropValue = useRef<string>(value);

  const executeCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    updateContent();
  };

  const updateContent = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange?.(content);
    }
  };

  // Initialize editor content and sync when parent `value` changes
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    // If the editor is focused (user is typing), don't clobber their caret/selection
    if (isFocused) return;

    // Only update if the incoming value differs from what's shown
    const incoming = value ?? '';
    if (el.innerHTML !== incoming) {
      el.innerHTML = incoming || '<p><br></p>';
      lastPropValue.current = incoming;
    }
  }, [value, isFocused]);

  const handleInput = () => {
    updateContent();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    updateContent();
  };

  return (
    <div className={`border border-gray-200 rounded-lg bg-white ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('bold')}
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('italic')}
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('underline')}
          className="h-8 w-8 p-0"
        >
          <Underline className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-4 bg-gray-300 mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('justifyLeft')}
          className="h-8 w-8 p-0"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('justifyCenter')}
          className="h-8 w-8 p-0"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('justifyRight')}
          className="h-8 w-8 p-0"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-4 bg-gray-300 mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('insertUnorderedList')}
          className="h-8 w-8 p-0"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand('insertOrderedList')}
          className="h-8 w-8 p-0"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        spellCheck={true}
        dir={dir}
        onInput={handleInput}
        onPaste={handlePaste}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`min-h-[120px] p-3 text-sm ${dir === 'rtl' ? 'text-right' : 'text-left'} focus:outline-none ${
          isFocused ? 'ring-1 ring-primary' : ''
        }`}
        style={{ 
          fontFamily: 'inherit',
          lineHeight: '1.5',
          direction: dir,
          textAlign: dir === 'rtl' ? 'right' : 'left'
        }}
      />
      
      {/* Placeholder */}
      
    </div>
  );
}
