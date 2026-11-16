"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-client";
import type { Category } from "@/types/dashboard";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshCategories = useCallback(async () => {
    try {
      setCategories(await api.getCategories());
      setError(null);
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Could not load categories."),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    api.getCategories()
      .then((result) => {
        if (isActive) setCategories(result);
      })
      .catch((err: unknown) => {
        if (isActive) {
          setError(
            getApiErrorMessage(err, "Could not load categories."),
          );
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  return { categories, isLoading, error, refreshCategories };
}
