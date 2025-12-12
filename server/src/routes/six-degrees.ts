import type { Request, Response } from "express"
import { searchPerson } from "../lib/tmdb.js"
import { findConnection, clearFilmographyCache } from "../lib/six-degrees.js"

// Search actors via TMDB
export async function searchActorsRoute(req: Request, res: Response) {
  try {
    const query = req.query.q as string

    if (!query || query.trim().length < 2) {
      res.json({ results: [] })
      return
    }

    const response = await searchPerson(query.trim())

    // Filter to actors only and format response
    const actors = response.results
      .filter((person) => person.known_for_department === "Acting")
      .slice(0, 10)
      .map((person) => ({
        id: person.id,
        name: person.name,
        profilePath: person.profile_path,
        knownFor: person.known_for
          .filter((item) => item.title || item.name)
          .slice(0, 3)
          .map((item) => item.title || item.name),
      }))

    res.json({ results: actors })
  } catch (error) {
    console.error("Actor search error:", error)
    res.status(500).json({ error: { message: "Failed to search actors" } })
  }
}

// Find connection between two actors
export async function getConnectionRoute(req: Request, res: Response) {
  try {
    const actorAId = parseInt(req.params.actorAId)
    const actorBId = parseInt(req.params.actorBId)

    if (isNaN(actorAId) || isNaN(actorBId)) {
      res.status(400).json({ error: { message: "Invalid actor IDs" } })
      return
    }

    // Set a timeout for the search (30 seconds)
    const timeoutMs = 30000
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => {
        clearFilmographyCache()
        reject(new Error("Search timed out"))
      }, timeoutMs)
    })

    const searchPromise = findConnection(actorAId, actorBId, { maxDegrees: 6 })

    const result = await Promise.race([searchPromise, timeoutPromise])

    if (!result) {
      res.json({
        found: false,
        message: "No connection found within 6 degrees of separation",
      })
      return
    }

    res.json({
      found: true,
      degrees: result.degrees,
      path: result.path,
      totalDeceased: result.totalDeceased,
      deceasedOnPath: result.deceasedOnPath,
    })
  } catch (error) {
    console.error("Connection search error:", error)

    if (error instanceof Error && error.message === "Search timed out") {
      res.status(408).json({ error: { message: "Search timed out. Try different actors." } })
      return
    }

    res.status(500).json({ error: { message: "Failed to find connection" } })
  }
}
