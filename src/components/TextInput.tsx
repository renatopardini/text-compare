"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import type { Encoding } from "@/lib/decodeFile";
import type { Messages } from "@/lib/i18n";

export type FileInfo = { name?: string; encoding?: Encoding; error?: string };

type Props = {
  label: string;
  value: string;
  file: FileInfo;
  t: Messages;
  onChange: (value: string) => void;
  onFiles: (files: File[]) => void;
};

const hasFiles = (e: DragEvent) => e.dataTransfer.types.includes("Files");

export function TextInput({ label, value, file, t, onChange, onFiles }: Props) {
  const id = useId();
  const picker = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const error = file.error && (t.fileErrors[file.error as keyof Messages["fileErrors"]] ?? t.fileReadError);

  return (
    <div className="flex flex-col gap-1 text-sm">
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="font-medium">{label}</label>
        {file.name && (
          <span className="truncate text-xs text-zinc-500">
            {file.name}
            {file.encoding && ` · ${t.encoding[file.encoding]}`}
          </span>
        )}
        <button type="button" className="ml-auto shrink-0 text-xs text-blue-600 hover:underline dark:text-blue-400" onClick={() => picker.current?.click()}>
          {t.openFile}
        </button>
        <input
          ref={picker}
          type="file"
          hidden
          multiple
          onChange={(e) => {
            if (e.target.files?.length) onFiles([...e.target.files]);
            e.target.value = ""; // permite reabrir o mesmo arquivo
          }}
        />
      </div>
      <textarea
        id={id}
        value={value}
        placeholder={t.placeholder}
        spellCheck={false}
        aria-invalid={!!error}
        onChange={(e) => onChange(e.target.value)}
        onDragOver={(e) => { if (hasFiles(e)) { e.preventDefault(); setDragging(true); } }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          setDragging(false);
          if (!e.dataTransfer.files.length) return; // texto arrastado segue o comportamento normal
          e.preventDefault();
          onFiles([...e.dataTransfer.files]);
        }}
        className={`h-72 w-full resize-y rounded border bg-white p-3 font-mono text-sm outline-none focus:border-blue-500 dark:bg-zinc-900 ${
          dragging ? "border-2 border-dashed border-blue-500" : "border-zinc-300 dark:border-zinc-700"
        }`}
      />
      {error && <p role="alert" className="text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
