import { apiRequest } from "./client";
import type {
  CategoriesResponse,
  ExampleSearchResponse,
  ExamplesByCategoryResponse,
} from "../types/api";

export async function getCategories(): Promise<CategoriesResponse> {
  return apiRequest<CategoriesResponse>("/examples/categories");
}

export async function getExamplesByCategory(
  category: string,
  limit: number,
): Promise<ExamplesByCategoryResponse> {
  const query = new URLSearchParams({ category, limit: String(limit) });
  return apiRequest<ExamplesByCategoryResponse>(`/examples/by-category?${query}`);
}

export async function searchExamples(
  keyword: string,
  limit: number,
): Promise<ExampleSearchResponse> {
  return apiRequest<ExampleSearchResponse, { keyword: string; limit: number }>(
    "/examples/search",
    {
      method: "POST",
      body: { keyword, limit },
    },
  );
}
