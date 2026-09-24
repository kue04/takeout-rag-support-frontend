import { apiRequest } from "./client";
import type {
  CategoriesResponse,
  ExampleSearchResponse,
  ExamplesByCategoryResponse,
} from "../types/api";

/** 种子 FAQ 浏览。需要 `read:example_read` —— **agent 角色没有这个 scope**。 */
export async function getCategories(): Promise<CategoriesResponse> {
  return apiRequest<CategoriesResponse>("/examples/categories");
}

export async function getExamplesByCategory(
  category: string,
  limit: number,
): Promise<ExamplesByCategoryResponse> {
  return apiRequest<ExamplesByCategoryResponse>("/examples/by-category", {
    query: { category, limit },
  });
}

export async function searchExamples(
  keyword: string,
  limit: number,
): Promise<ExampleSearchResponse> {
  return apiRequest<ExampleSearchResponse, { keyword: string; limit: number }>(
    "/examples/search",
    { method: "POST", body: { keyword, limit } },
  );
}
