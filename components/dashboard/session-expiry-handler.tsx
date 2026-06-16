"use client";

import { useEffect, useRef } from "react";

export function SessionExpiryHandler() {
  const patchedRef = useRef(false);

  useEffect(() => {
    if (patchedRef.current) return;
    patchedRef.current = true;

    const originalFetch = window.fetch;
    let isRedirecting = false;

    window.fetch = async function patchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const response = await originalFetch(input, init);

      if (response.status === 401 && !isRedirecting) {
        isRedirecting = true;
        const currentPath = window.location.pathname;
        const isAuthRoute = currentPath.startsWith("/login") || currentPath.startsWith("/register");
        if (!isAuthRoute) {
          const callbackUrl = currentPath !== "/" ? `?callbackUrl=${encodeURIComponent(currentPath)}` : "";
          window.location.href = `/login${callbackUrl}`;
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
      patchedRef.current = false;
    };
  }, []);

  return null;
}
