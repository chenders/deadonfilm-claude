import { useState, useEffect } from "react"
import { useSearchParams, Link } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import { useConnection } from "@/hooks/useSixDegrees"
import { getActor } from "@/services/api"
import { ActorSearchInput } from "@/components/six-degrees/ActorSearchInput"
import { ConnectionPath } from "@/components/six-degrees/ConnectionPath"
import type { ActorSearchResult, ConnectionResult } from "@/types"

export default function SixDegreesPage() {
  const [searchParams] = useSearchParams()
  const fromActorId = searchParams.get("from")

  const [actorA, setActorA] = useState<ActorSearchResult | null>(null)
  const [actorB, setActorB] = useState<ActorSearchResult | null>(null)
  const [shouldSearch, setShouldSearch] = useState(false)

  // Pre-populate actor A from URL param
  useEffect(() => {
    async function loadActorFromUrl() {
      if (fromActorId && !actorA) {
        try {
          const actorId = parseInt(fromActorId)
          if (!isNaN(actorId)) {
            const response = await getActor(actorId)
            setActorA({
              id: response.actor.id,
              name: response.actor.name,
              profilePath: response.actor.profilePath,
              knownFor: response.analyzedFilmography.slice(0, 3).map((m) => m.title),
            })
          }
        } catch (error) {
          console.error("Failed to load actor from URL:", error)
        }
      }
    }
    loadActorFromUrl()
  }, [fromActorId, actorA])

  const { data, isLoading, error } = useConnection(
    shouldSearch && actorA ? actorA.id : null,
    shouldSearch && actorB ? actorB.id : null
  )

  const handleFindConnection = () => {
    if (actorA && actorB) {
      setShouldSearch(true)
    }
  }

  // Reset search when actors change
  useEffect(() => {
    setShouldSearch(false)
  }, [actorA, actorB])

  const canSearch = actorA && actorB

  return (
    <>
      <Helmet>
        <title>Six Degrees of Death | Dead on Film</title>
        <meta
          name="description"
          content="Find the connection between any two actors through their shared movies, and discover how many deceased actors link them together."
        />
      </Helmet>

      <div className="min-h-screen bg-zinc-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <Link to="/" className="mb-6 inline-block text-zinc-400 transition hover:text-white">
              &larr; Back to Search
            </Link>
            <h1 className="mb-2 text-4xl font-bold text-white">Six Degrees of Death</h1>
            <p className="mx-auto max-w-2xl text-zinc-400">
              Find the shortest path between any two actors through their shared movies, and
              discover the mortality chain that connects them.
            </p>
          </div>

          {/* Actor Selection */}
          <div
            className="mx-auto mb-8 grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2"
            data-testid="actor-selection"
          >
            <ActorSearchInput
              label="Actor A"
              selectedActor={actorA}
              onSelect={setActorA}
              placeholder="Search for first actor..."
            />
            <ActorSearchInput
              label="Actor B"
              selectedActor={actorB}
              onSelect={setActorB}
              placeholder="Search for second actor..."
            />
          </div>

          {/* Find Connection Button */}
          <div className="mb-8 text-center">
            <button
              onClick={handleFindConnection}
              disabled={!canSearch || isLoading}
              className="rounded-lg bg-red-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-zinc-700"
              data-testid="find-connection-button"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Searching...
                </span>
              ) : (
                "Find Connection"
              )}
            </button>
          </div>

          {/* Error State */}
          {error && (
            <div
              className="mx-auto mb-8 max-w-2xl rounded-lg border border-red-800 bg-red-900/30 p-4 text-center text-red-300"
              data-testid="connection-error"
            >
              {error instanceof Error ? error.message : "Failed to find connection"}
            </div>
          )}

          {/* Results */}
          {data && (
            <div className="mx-auto max-w-2xl" data-testid="connection-result">
              {data.found ? (
                <ConnectionPath
                  degrees={(data as ConnectionResult).degrees}
                  path={(data as ConnectionResult).path}
                  totalDeceased={(data as ConnectionResult).totalDeceased}
                  deceasedOnPath={(data as ConnectionResult).deceasedOnPath}
                />
              ) : (
                <div className="rounded-lg bg-zinc-800 p-8 text-center" data-testid="no-connection">
                  <svg
                    className="mx-auto mb-4 h-16 w-16 text-zinc-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                    />
                  </svg>
                  <h2 className="mb-2 text-xl font-semibold text-white">No Connection Found</h2>
                  <p className="text-zinc-400">
                    These actors could not be connected within 6 degrees of separation. Try
                    different actors or check for typos.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Instructions (when no search yet) */}
          {!data && !isLoading && !error && (
            <div className="mx-auto max-w-2xl rounded-lg border border-zinc-700 bg-zinc-800/50 p-8 text-center">
              <h2 className="mb-4 text-lg font-semibold text-white">How It Works</h2>
              <ol className="mx-auto max-w-md space-y-3 text-left text-zinc-400">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-600 text-sm text-white">
                    1
                  </span>
                  <span>Select two actors using the search boxes above</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-600 text-sm text-white">
                    2
                  </span>
                  <span>Click &ldquo;Find Connection&rdquo; to discover their link</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-600 text-sm text-white">
                    3
                  </span>
                  <span>See the movies that connect them and the deceased actors on the path</span>
                </li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
