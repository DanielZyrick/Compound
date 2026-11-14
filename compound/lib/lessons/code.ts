// Names for the code blocks in lessons: the label in a block's header.

const LANGUAGE_NAMES: Record<string, string> = {
  bash: "Bash",
  c: "C",
  cpp: "C++",
  csharp: "C#",
  css: "CSS",
  go: "Go",
  html: "HTML",
  java: "Java",
  javascript: "JavaScript",
  js: "JavaScript",
  json: "JSON",
  jsx: "JSX",
  kotlin: "Kotlin",
  php: "PHP",
  powershell: "PowerShell",
  py: "Python",
  python: "Python",
  ruby: "Ruby",
  rust: "Rust",
  sh: "Shell",
  shell: "Shell",
  sql: "SQL",
  swift: "Swift",
  text: "Text",
  ts: "TypeScript",
  tsx: "TSX",
  typescript: "TypeScript",
  yaml: "YAML",
};

/** "python" → "Python", "tsx" → "TSX"; an unknown id is shown capitalised. */
export function languageName(language: string): string {
  const id = language.trim().toLowerCase();
  if (id === "") return "Code";
  return LANGUAGE_NAMES[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

/** What a block's header says: the file name when there is one, else the language. */
export function codeBlockTitle(block: { language: string; filename: string | null }): string {
  return block.filename?.trim() || languageName(block.language);
}
