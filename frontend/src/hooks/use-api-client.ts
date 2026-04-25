import { useRef, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createApiClient } from "@/lib/api";

export function useApiClient() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  return useMemo(() => createApiClient(() => getTokenRef.current()), []);
}
