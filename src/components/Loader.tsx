export function Loader({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
      <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
      {label}
    </div>
  );
}
