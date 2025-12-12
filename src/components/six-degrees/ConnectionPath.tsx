import { Link } from "react-router-dom"
import { getProfileUrl } from "@/services/api"
import type { PathSegment, DeceasedOnPath } from "@/types"

interface ConnectionPathProps {
  degrees: number
  path: PathSegment[]
  totalDeceased: number
  deceasedOnPath: DeceasedOnPath[]
}

export function ConnectionPath({
  degrees,
  path,
  totalDeceased,
  deceasedOnPath,
}: ConnectionPathProps) {
  return (
    <div className="space-y-6" data-testid="connection-path">
      {/* Summary */}
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-white">
          {degrees === 0 ? (
            "Same Actor"
          ) : (
            <>
              Connected in{" "}
              <span className="text-red-500">
                {degrees} degree{degrees !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </h2>
        {totalDeceased > 0 && (
          <p className="text-zinc-400">
            <span className="font-semibold text-red-400">{totalDeceased}</span> deceased actor
            {totalDeceased !== 1 ? "s" : ""} on this path
          </p>
        )}
      </div>

      {/* Visual Path */}
      <div className="flex flex-col items-center space-y-0" data-testid="connection-path-chain">
        {path.map((segment, index) => (
          <div key={segment.actor.id} className="flex w-full max-w-md flex-col items-center">
            {/* Actor Card */}
            <Link
              to={`/actor/${segment.actor.id}`}
              className="hover:bg-zinc-750 group flex w-full items-center gap-4 rounded-lg bg-zinc-800 p-4 transition-colors"
              data-testid={`path-actor-${segment.actor.id}`}
            >
              {segment.actor.profilePath ? (
                <img
                  src={getProfileUrl(segment.actor.profilePath, "w185") || ""}
                  alt={segment.actor.name}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-700 text-zinc-500">
                  <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white transition-colors group-hover:text-red-400">
                    {segment.actor.name}
                  </span>
                  {segment.actor.isDeceased && (
                    <span className="text-red-500" title="Deceased">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 11-2 0 1 1 0 012 0zm6 0a1 1 0 11-2 0 1 1 0 012 0zm-3 6a4 4 0 01-4-4h8a4 4 0 01-4 4z" />
                      </svg>
                    </span>
                  )}
                </div>
              </div>
            </Link>

            {/* Movie Connection (if not last actor) */}
            {segment.movie && index < path.length - 1 && (
              <div
                className="flex items-center py-2"
                data-testid={`path-movie-${segment.movie.id}`}
              >
                <div className="h-4 w-px bg-zinc-600" />
                <div className="flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm">
                  <svg
                    className="h-4 w-4 text-zinc-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 4v16M17 4v16M3 8h18M3 16h18"
                    />
                  </svg>
                  <Link
                    to={`/movie/${segment.movie.title.toLowerCase().replace(/\s+/g, "-")}-${segment.movie.year || "unknown"}-${segment.movie.id}`}
                    className="text-zinc-300 transition-colors hover:text-white"
                  >
                    {segment.movie.title}
                    {segment.movie.year && (
                      <span className="ml-1 text-zinc-500">({segment.movie.year})</span>
                    )}
                  </Link>
                </div>
                <div className="h-4 w-px bg-zinc-600" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Deceased Details */}
      {deceasedOnPath.length > 0 && (
        <div className="mt-8 border-t border-zinc-800 pt-6" data-testid="deceased-on-path">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 11-2 0 1 1 0 012 0zm6 0a1 1 0 11-2 0 1 1 0 012 0zm-3 6a4 4 0 01-4-4h8a4 4 0 01-4 4z" />
            </svg>
            Deaths on Path
          </h3>
          <ul className="space-y-3">
            {deceasedOnPath.map((deceased) => (
              <li key={deceased.id} className="flex items-center gap-3 text-zinc-300">
                <span className="font-medium">{deceased.name}</span>
                {deceased.deathday && (
                  <span className="text-zinc-500">
                    (
                    {new Date(deceased.deathday).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                    )
                  </span>
                )}
                {deceased.ageAtDeath && (
                  <span className="text-zinc-500">Age {deceased.ageAtDeath}</span>
                )}
                {deceased.causeOfDeath && (
                  <span className="text-sm text-red-400">- {deceased.causeOfDeath}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
