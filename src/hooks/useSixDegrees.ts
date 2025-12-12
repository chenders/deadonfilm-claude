import { useQuery } from "@tanstack/react-query"
import { searchActors, getConnection } from "@/services/api"

export function useActorSearch(query: string) {
  return useQuery({
    queryKey: ["actorSearch", query],
    queryFn: () => searchActors(query),
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
}

export function useConnection(actorAId: number | null, actorBId: number | null) {
  return useQuery({
    queryKey: ["connection", actorAId, actorBId],
    queryFn: () => getConnection(actorAId!, actorBId!),
    enabled: actorAId !== null && actorBId !== null && actorAId > 0 && actorBId > 0,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    retry: false, // Don't retry failed searches
  })
}
