import {
  defaultShouldDehydrateQuery,
  QueryClient,
  QueryCache,
  MutationCache,
} from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import SuperJSON from "superjson";

export const createQueryClient = () =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: (err) => {
        if (typeof window === "undefined") return;
        if (err instanceof TRPCClientError) {
          const code = (err.data as unknown as { code?: string } | undefined)?.code;
          if (code === "UNAUTHORIZED") {
            const cb = encodeURIComponent(window.location.href);
            window.location.assign(`/auth/signin?callbackUrl=${cb}`);
          }
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (err) => {
        if (typeof window === "undefined") return;
        if (err instanceof TRPCClientError) {
          const code = (err.data as unknown as { code?: string } | undefined)?.code;
          if (code === "UNAUTHORIZED") {
            const cb = encodeURIComponent(window.location.href);
            window.location.assign(`/auth/signin?callbackUrl=${cb}`);
          }
        }
      },
    }),
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000,
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });
