// components/EditorHTML.tsx
'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

// Dynamically import JoditEditor (important!)
const JoditEditor = dynamic(() => import('jodit-react'), { ssr: false });

interface Props {
  value: string;
  onChange: (d: string) => void;
  placeholder?: string;
  className?: string;
  dir?: 'ltr' | 'rtl';
}

export default function EditorHTML({ value, onChange, placeholder = 'Start writing...', className = '', dir = 'ltr' }: Props) {
  const config = useMemo(
    () => ({
      readonly: false,
      spellcheck: false,
      askBeforePasteHTML: false,
      uploader: {
        insertImageAsBase64URI: true,
      },
      placeholder,
      height: 450,
      toolbar: true, // Use default toolbar
    }),
    [placeholder]
  );

  return (
    <div
      className={`editor-wrapper border border-gray-200 rounded-lg bg-white ${className}`}
      style={{
        direction: dir,
        textAlign: dir === 'rtl' ? 'right' : 'left',
      }}
    >
      <JoditEditor
        config={config}
        value={value}
        onChange={(newContent: string) => {
          if (newContent !== value) {
            onChange(newContent);
          }
        }}
      />
    </div>
  );
}
