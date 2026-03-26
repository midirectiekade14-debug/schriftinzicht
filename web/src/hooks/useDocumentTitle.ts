import { useEffect } from 'react';

export default function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} — SchriftInzicht` : 'SchriftInzicht';
    return () => { document.title = 'SchriftInzicht'; };
  }, [title]);
}
