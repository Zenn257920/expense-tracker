"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-client";
import type { Category } from "@/types/dashboard";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(false);

  const refreshCategories = useCallback(async () => {
    try {
      const result = await api.getCategories();
      if (isMounted.current) {
        setCategories(result);
        setError(null);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(getApiErrorMessage(err, "Could not load categories."));
      }
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    void refreshCategories();
    return () => {
      isMounted.current = false;
    };
  }, [refreshCategories]);

  return { categories, isLoading, error, refreshCategories };
}
