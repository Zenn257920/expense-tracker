"use client";

import { useCallback, useEffect, useState } from "react";

import type { Category } from "@/types/dashboard";

interface CategoriesResponse {
  success: boolean;
  data: Category[];
}

async function getCategories() {
  const response = await fetch("/api/categories");

  if (!response.ok) {
    throw new Error("Could not load categories.");
  }

  const result: CategoriesResponse = await response.json();
  return result.data;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshCategories = useCallback(async () => {
    try {
      setCategories(await getCategories());
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load categories.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    getCategories()
      .then((result) => {
        if (isActive) setCategories(result);
      })
      .catch((err: unknown) => {
        if (isActive) {
          setError(
            err instanceof Error ? err.message : "Could not load categories.",
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
