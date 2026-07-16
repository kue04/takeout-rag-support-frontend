import { apiRequest } from "./client";
import type {
  CategoriesResponse,
  ExampleSearchResponse,
  ExamplesByCategoryResponse,
} from "../types/api";

export async function getCategories(): Promise<CategoriesResponse> {
  return apiRequest<CategoriesResponse>("/examples/categories", {
    role: "knowledge_ops",
    operatorId: "knowledge_ops_demo",
  });
}

export async function getExamplesByCategory(
  category: string,
  limit: number,
): Promise<ExamplesByCategoryResponse> {
  const query = new URLSearchParams({ category, limit: String(limit) });
  return apiRequest<ExamplesByCategoryResponse>(`/examples/by-category?${query}`, {
    role: "knowledge_ops",
    operatorId: "knowledge_ops_demo",
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
      role: "knowledge_ops",
      operatorId: "knowledge_ops_demo",
    },
  );
}
