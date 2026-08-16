"use server"

import { PublicServerFetchJson } from "@/src/lib/PublicServerFetch"
import { isBackendOfflineError } from "@/src/lib/backend-offline"
import logger from "@/src/lib/logger"

const log = logger.child("BranchService")

export const getBranches = async () => {
  try {
    const data = await PublicServerFetchJson(`/platform/branches?page=${1}&limit=${20}`)
    return data
  } catch (error) {
    if (isBackendOfflineError(error)) {
      log.warn("getBranches: backend offline — using demo branches")
    } else {
      log.error("getBranches failed", error instanceof Error ? error.message : error)
    }
    return { data: [] }
  }
}
