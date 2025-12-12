import { getPersonCredits, getPersonDetails, type TMDBPersonCredits } from "./tmdb.js"
import { getDeceasedPersons } from "./db.js"

// Types for the connection path
export interface PathActor {
  id: number
  name: string
  profilePath: string | null
  isDeceased: boolean
}

export interface PathMovie {
  id: number
  title: string
  year: number | null
  posterPath: string | null
}

export interface PathSegment {
  actor: PathActor
  movie: PathMovie | null // null for the final actor in the chain
}

export interface DeceasedOnPath {
  id: number
  name: string
  deathday: string | null
  causeOfDeath: string | null
  ageAtDeath: number | null
}

export interface ConnectionResult {
  degrees: number
  path: PathSegment[]
  totalDeceased: number
  deceasedOnPath: DeceasedOnPath[]
}

// Cache for filmographies during a search session
const filmographyCache = new Map<number, TMDBPersonCredits>()

/**
 * Get an actor's filmography, using cache if available
 */
async function getFilmography(actorId: number): Promise<TMDBPersonCredits> {
  if (filmographyCache.has(actorId)) {
    return filmographyCache.get(actorId)!
  }

  const credits = await getPersonCredits(actorId)
  filmographyCache.set(actorId, credits)
  return credits
}

/**
 * Clear the filmography cache (call after search is complete)
 */
export function clearFilmographyCache(): void {
  filmographyCache.clear()
}

/**
 * Get all co-stars of an actor from their filmography
 * Returns a map of actorId -> { movieId, movieTitle, movieYear }
 */
async function getCoStars(
  actorId: number
): Promise<Map<number, { movieId: number; movieTitle: string; movieYear: number | null }>> {
  const filmography = await getFilmography(actorId)
  const coStars = new Map<
    number,
    { movieId: number; movieTitle: string; movieYear: number | null }
  >()

  // For each movie the actor was in, get its credits
  // Limit to top movies by popularity to avoid too many API calls
  const topMovies = filmography.cast
    .filter((movie) => movie.release_date) // Only movies with release dates
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 20) // Limit to top 20 movies

  for (const movie of topMovies) {
    try {
      // Import dynamically to avoid circular dependency
      const { getMovieCredits } = await import("./tmdb.js")
      const credits = await getMovieCredits(movie.id)

      // Get year from release date
      const year = movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : null

      // Add all cast members as potential connections
      for (const castMember of credits.cast.slice(0, 30)) {
        // Top 30 billed actors
        if (castMember.id !== actorId && !coStars.has(castMember.id)) {
          coStars.set(castMember.id, {
            movieId: movie.id,
            movieTitle: movie.title,
            movieYear: year,
          })
        }
      }
    } catch (error) {
      // Skip movies that fail to load
      console.warn(`Failed to get credits for movie ${movie.id}:`, error)
    }
  }

  return coStars
}

interface BFSNode {
  actorId: number
  parent: BFSNode | null
  movie: { id: number; title: string; year: number | null } | null
}

/**
 * Find the shortest connection path between two actors using bidirectional BFS
 */
export async function findConnection(
  actorAId: number,
  actorBId: number,
  options: { maxDegrees?: number } = {}
): Promise<ConnectionResult | null> {
  const maxDegrees = options.maxDegrees ?? 6

  // Same actor = 0 degrees
  if (actorAId === actorBId) {
    const person = await getPersonDetails(actorAId)
    return {
      degrees: 0,
      path: [
        {
          actor: {
            id: person.id,
            name: person.name,
            profilePath: person.profile_path,
            isDeceased: !!person.deathday,
          },
          movie: null,
        },
      ],
      totalDeceased: person.deathday ? 1 : 0,
      deceasedOnPath: [],
    }
  }

  // Clear cache for fresh search
  clearFilmographyCache()

  // Bidirectional BFS
  const visitedFromA = new Map<number, BFSNode>()
  const visitedFromB = new Map<number, BFSNode>()
  const queueA: BFSNode[] = [{ actorId: actorAId, parent: null, movie: null }]
  const queueB: BFSNode[] = [{ actorId: actorBId, parent: null, movie: null }]

  visitedFromA.set(actorAId, queueA[0])
  visitedFromB.set(actorBId, queueB[0])

  let degreesFromA = 0
  let degreesFromB = 0
  let meetingPoint: {
    actorId: number
    movieFromA: BFSNode["movie"]
    movieFromB: BFSNode["movie"]
  } | null = null

  while (queueA.length > 0 || queueB.length > 0) {
    // Check if we've exceeded max degrees
    if (degreesFromA + degreesFromB >= maxDegrees) {
      break
    }

    // Expand from A side
    if (queueA.length > 0 && degreesFromA <= degreesFromB) {
      const currentLevelSize = queueA.length
      degreesFromA++

      for (let i = 0; i < currentLevelSize; i++) {
        const current = queueA.shift()!
        const coStars = await getCoStars(current.actorId)

        for (const [coStarId, movieInfo] of coStars) {
          // Check if we found a connection to B side
          if (visitedFromB.has(coStarId)) {
            meetingPoint = {
              actorId: coStarId,
              movieFromA: {
                id: movieInfo.movieId,
                title: movieInfo.movieTitle,
                year: movieInfo.movieYear,
              },
              movieFromB: visitedFromB.get(coStarId)!.movie,
            }
            // Add the final hop to visitedFromA for path reconstruction
            visitedFromA.set(coStarId, {
              actorId: coStarId,
              parent: current,
              movie: {
                id: movieInfo.movieId,
                title: movieInfo.movieTitle,
                year: movieInfo.movieYear,
              },
            })
            break
          }

          if (!visitedFromA.has(coStarId)) {
            const node: BFSNode = {
              actorId: coStarId,
              parent: current,
              movie: {
                id: movieInfo.movieId,
                title: movieInfo.movieTitle,
                year: movieInfo.movieYear,
              },
            }
            visitedFromA.set(coStarId, node)
            queueA.push(node)
          }
        }

        if (meetingPoint) break
      }

      if (meetingPoint) break
    }

    // Expand from B side
    if (queueB.length > 0 && !meetingPoint) {
      const currentLevelSize = queueB.length
      degreesFromB++

      for (let i = 0; i < currentLevelSize; i++) {
        const current = queueB.shift()!
        const coStars = await getCoStars(current.actorId)

        for (const [coStarId, movieInfo] of coStars) {
          // Check if we found a connection to A side
          if (visitedFromA.has(coStarId)) {
            meetingPoint = {
              actorId: coStarId,
              movieFromA: visitedFromA.get(coStarId)!.movie,
              movieFromB: {
                id: movieInfo.movieId,
                title: movieInfo.movieTitle,
                year: movieInfo.movieYear,
              },
            }
            // Add the final hop to visitedFromB for path reconstruction
            visitedFromB.set(coStarId, {
              actorId: coStarId,
              parent: current,
              movie: {
                id: movieInfo.movieId,
                title: movieInfo.movieTitle,
                year: movieInfo.movieYear,
              },
            })
            break
          }

          if (!visitedFromB.has(coStarId)) {
            const node: BFSNode = {
              actorId: coStarId,
              parent: current,
              movie: {
                id: movieInfo.movieId,
                title: movieInfo.movieTitle,
                year: movieInfo.movieYear,
              },
            }
            visitedFromB.set(coStarId, node)
            queueB.push(node)
          }
        }

        if (meetingPoint) break
      }

      if (meetingPoint) break
    }
  }

  // No connection found
  if (!meetingPoint) {
    clearFilmographyCache()
    return null
  }

  // Reconstruct path from A to meeting point
  const pathFromA: Array<{ actorId: number; movie: BFSNode["movie"] }> = []
  let nodeA = visitedFromA.get(meetingPoint.actorId)
  while (nodeA) {
    pathFromA.unshift({ actorId: nodeA.actorId, movie: nodeA.movie })
    nodeA = nodeA.parent ?? undefined
  }

  // Reconstruct path from meeting point to B
  const pathFromB: Array<{ actorId: number; movie: BFSNode["movie"] }> = []
  let nodeB = visitedFromB.get(meetingPoint.actorId)?.parent
  while (nodeB) {
    pathFromB.push({ actorId: nodeB.actorId, movie: nodeB.movie })
    nodeB = nodeB.parent ?? undefined
  }

  // Combine paths
  const combinedPath = [...pathFromA]
  for (const segment of pathFromB) {
    combinedPath.push(segment)
  }

  // Fetch actor details for the path
  const actorIds = combinedPath.map((p) => p.actorId)
  const actorDetails = new Map<
    number,
    { name: string; profilePath: string | null; isDeceased: boolean }
  >()

  for (const actorId of actorIds) {
    try {
      const person = await getPersonDetails(actorId)
      actorDetails.set(actorId, {
        name: person.name,
        profilePath: person.profile_path,
        isDeceased: !!person.deathday,
      })
    } catch {
      actorDetails.set(actorId, {
        name: `Actor ${actorId}`,
        profilePath: null,
        isDeceased: false,
      })
    }
  }

  // Build the final path with proper movie connections
  const finalPath: PathSegment[] = []
  for (let i = 0; i < combinedPath.length; i++) {
    const segment = combinedPath[i]
    const actorInfo = actorDetails.get(segment.actorId)!

    // For the movie, we need to use the connecting movie to the NEXT actor
    // The first segment in pathFromA has movie=null (it's the starting actor)
    // For subsequent segments, the movie is how we got TO this actor
    let connectingMovie: PathMovie | null = null

    if (i < combinedPath.length - 1) {
      // Look at the next segment to find the connecting movie
      const nextSegment = combinedPath[i + 1]
      if (nextSegment.movie) {
        connectingMovie = {
          id: nextSegment.movie.id,
          title: nextSegment.movie.title,
          year: nextSegment.movie.year,
          posterPath: null, // We'd need another API call to get this
        }
      }
    }

    finalPath.push({
      actor: {
        id: segment.actorId,
        name: actorInfo.name,
        profilePath: actorInfo.profilePath,
        isDeceased: actorInfo.isDeceased,
      },
      movie: connectingMovie,
    })
  }

  // Get deceased info from our database
  const deceasedActorIds = finalPath.filter((p) => p.actor.isDeceased).map((p) => p.actor.id)
  const deceasedInfoMap = await getDeceasedPersons(deceasedActorIds)

  const deceasedOnPath: DeceasedOnPath[] = []
  for (const actorId of deceasedActorIds) {
    const d = deceasedInfoMap.get(actorId)
    if (d) {
      deceasedOnPath.push({
        id: d.tmdb_id,
        name: d.name,
        deathday: d.deathday,
        causeOfDeath: d.cause_of_death,
        ageAtDeath: d.age_at_death,
      })
    }
  }

  // Clear cache after search
  clearFilmographyCache()

  return {
    degrees: finalPath.length - 1,
    path: finalPath,
    totalDeceased: finalPath.filter((p) => p.actor.isDeceased).length,
    deceasedOnPath,
  }
}
