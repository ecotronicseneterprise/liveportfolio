'use client'

// Comma-separated tech stack. The text is kept exactly as typed (so "React, " can be followed by the next item); the list is parsed on
// every change, and the text is tidied up when the field loses focus. If the list is changed from outside (undo, history), the text follows.
import { useEffect, useState } from 'react'

export const parseStack = (text: string): string[] => text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)

export default function StackInput({ value, onChange, className, style, id, placeholder = 'React, Node.js, PostgreSQL' }: {
  value: string[]
  onChange: (stack: string[]) => void
  className?: string
  style?: React.CSSProperties
  id?: string
  placeholder?: string
}) {
  const [text, setText] = useState(() => value.join(', '))

  useEffect(() => {
    // follow outside changes only; while typing the parsed text already equals the list
    setText((prev) => (JSON.stringify(parseStack(prev)) === JSON.stringify(value) ? prev : value.join(', ')))
  }, [value])

  return (
    <input
      id={id}
      type="text"
      placeholder={placeholder}
      value={text}
      onChange={(e) => { setText(e.target.value); onChange(parseStack(e.target.value)) }}
      onBlur={() => setText(parseStack(text).join(', '))}
      className={className}
      style={style}
    />
  )
}
