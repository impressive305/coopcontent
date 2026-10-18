"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

// Fetches `path` on mount and whenever it changes; `reload` refetches after a mutation.
export function useData<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));

  const load = useCallback(
    (isCurrent: () => boolean = () => true) =>
      path
        ? api<T>(path).then(
            (result) => {
              if (!isCurrent()) return;
              setData(result);
              setError(null);
              setLoading(false);
            },
            (e: Error) => {
              if (!isCurrent()) return;
              setError(e.message);
              setLoading(false);
            },
          )
        : Promise.resolve(),
    [path],
  );

  useEffect(() => {
    let current = true;
    load(() => current);
    return () => {
      current = false;
    };
  }, [load]);

  const reload = useCallback(() => {
    setLoading(true);
    return load();
  }, [load]);

  return { data, error, loading, reload };
}
