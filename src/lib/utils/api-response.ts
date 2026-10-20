import { NextResponse } from "next/server";

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: unknown;
}

interface ApiPaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function successResponse<T>(
  data: T,
  message?: string,
  status = 200
): NextResponse<ApiSuccessResponse<T>> {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
  };
  if (message) {
    body.message = message;
  }
  return NextResponse.json(body, { status });
}

export function errorResponse(
  message: string,
  status = 500,
  errors?: unknown
): NextResponse<ApiErrorResponse> {
  const body: ApiErrorResponse = {
    success: false,
    message,
  };
  if (errors !== undefined) {
    body.errors = errors;
  }
  return NextResponse.json(body, { status });
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): NextResponse<ApiPaginatedResponse<T>> {
  const totalPages = Math.ceil(total / limit);
  return NextResponse.json(
    {
      success: true as const,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    },
    { status: 200 }
  );
}
