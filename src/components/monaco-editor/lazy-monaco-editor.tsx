import { lazy, Suspense } from 'react';
import type { MonacoEditorProps } from './monaco-editor';

const MonacoEditor = lazy(() => import('./monaco-editor').then(module => ({ default: module.MonacoEditor })));

function EditorFallback() {
  return (
    <div className="size-full bg-bg-2 animate-pulse flex items-center justify-center">
      <div className="text-text-tertiary text-sm">Loading editor...</div>
    </div>
  );
}

export function LazyMonacoEditor(props: MonacoEditorProps) {
  return (
    <Suspense fallback={<EditorFallback />}>
      <MonacoEditor {...props} />
    </Suspense>
  );
}
