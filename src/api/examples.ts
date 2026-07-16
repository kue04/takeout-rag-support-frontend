import { apiRequest } from "./client";
import type {
  CategoriesResponse,
  ExampleSearchResponse,
  ExamplesByCategoryResponse,
} from "../types/api";

const exampleReadHeaders = {
  "X-Operator-Id": "knowledge_ops_demo",
  "X-User-Role": "knowledge_ops",
};

export async function getCategories(): Promise<CategoriesResponse> {
  return apiRequest<CategoriesResponse>("/examples/categories", {
    headers: exampleReadHeaders,
  });
}

export async function getExamplesByCategory(
  category: string,
  limit: number,
): Promise<ExamplesByCategoryResponse> {
  const query = new URLSearchParams({ category, limit: String(limit) });
  return apiRequest<ExamplesByCategoryResponse>(`/examples/by-category?${query}`, {
    headers: exampleReadHeaders,
  });
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
      headers: exampleReadHeaders,
    },
  );
}
