import { useState, useRef, useEffect } from "react"
import { useActorSearch } from "@/hooks/useSixDegrees"
import { getProfileUrl } from "@/services/api"
import type { ActorSearchResult } from "@/types"

interface ActorSearchInputProps {
  label: string
  selectedActor: ActorSearchResult | null
  onSelect: (actor: ActorSearchResult | null) => void
  placeholder?: string
}

export function ActorSearchInput({
  label,
  selectedActor,
  onSelect,
  placeholder = "Search for an actor...",
}: ActorSearchInputProps) {
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const { data, isLoading } = useActorSearch(debouncedQuery)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = (actor: ActorSearchResult) => {
    onSelect(actor)
    setQuery("")
    setIsOpen(false)
  }

  const handleClear = () => {
    onSelect(null)
    setQuery("")
    inputRef.current?.focus()
  }

  if (selectedActor) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-400">{label}</label>
        <div
          className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800 p-3"
          data-testid={`selected-actor-${label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          {selectedActor.profilePath ? (
            <img
              src={getProfileUrl(selectedActor.profilePath, "w45") || ""}
              alt={selectedActor.name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700 text-zinc-500">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-white">{selectedActor.name}</p>
            {selectedActor.knownFor.length > 0 && (
              <p className="truncate text-xs text-zinc-400">{selectedActor.knownFor.join(", ")}</p>
            )}
          </div>
          <button
            onClick={handleClear}
            className="p-1 text-zinc-400 transition-colors hover:text-white"
            aria-label="Clear selection"
            data-testid={`clear-actor-${label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2" ref={containerRef}>
      <label className="block text-sm font-medium text-zinc-400">{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-red-500"
          data-testid={`actor-search-${label.toLowerCase().replace(/\s+/g, "-")}`}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg
              className="h-5 w-5 animate-spin text-zinc-400"
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
          </div>
        )}

        {isOpen && data?.results && data.results.length > 0 && (
          <ul
            className="absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl"
            data-testid={`actor-search-results-${label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {data.results.map((actor) => (
              <li key={actor.id}>
                <button
                  onClick={() => handleSelect(actor)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-700"
                >
                  {actor.profilePath ? (
                    <img
                      src={getProfileUrl(actor.profilePath, "w45") || ""}
                      alt={actor.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700 text-zinc-500">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">{actor.name}</p>
                    {actor.knownFor.length > 0 && (
                      <p className="truncate text-xs text-zinc-400">{actor.knownFor.join(", ")}</p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {isOpen && debouncedQuery.length >= 2 && !isLoading && data?.results.length === 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 p-4 text-center text-zinc-400 shadow-xl">
            No actors found
          </div>
        )}
      </div>
    </div>
  )
}
