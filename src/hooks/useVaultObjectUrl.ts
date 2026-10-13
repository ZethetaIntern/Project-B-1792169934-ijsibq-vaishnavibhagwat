import { useEffect, useState } from 'react';
import { getFile } from '../utils/documentVault';

/**
 * Object URL for a file held in the vault, e.g. an image thumbnail. The URL is
 * revoked when the component unmounts or the id changes, so previews never leak.
 */
export function useVaultObjectUrl(id: string, enabled = true): string | null {
  const [preview, setPreview] = useState<{ id: string; url: string } | null>(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    let url: string | null = null;
    getFile(id)
      .then((blob) => {
        if (cancelled || !blob) return;
        url = URL.createObjectURL(blob);
        setPreview({ id, url });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, enabled]);

  return enabled && preview?.id === id ? preview.url : null;
}
