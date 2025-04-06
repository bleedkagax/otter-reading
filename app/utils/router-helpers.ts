/**
 * This file provides utilities to help with the transition from Remix to React Router v7
 */

// Simple implementation of json helper
export function json<T>(data: T, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  
  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

// Simple implementation of redirect helper
export function redirect(url: string, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set('Location', url);
  
  return new Response(null, {
    ...init,
    status: init?.status || 302,
    headers,
  });
}

// Type for loader and action functions
export type LoaderFunctionArgs = {
  request: Request;
  params: Record<string, string | undefined>;
};

export type ActionFunctionArgs = LoaderFunctionArgs; 