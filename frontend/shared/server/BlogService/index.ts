"use server"

import { PublicServerFetchJson } from "@/src/lib/PublicServerFetch"
import { isBackendOfflineError } from "@/src/lib/backend-offline"
import logger from "@/src/lib/logger"

const log = logger.child("BlogService")

export const getBlogs = async () => {
  try {
    const data = await PublicServerFetchJson(`/platform/blogs?page=${1}&limit=${20}`)
    return data
  } catch (error) {
    if (isBackendOfflineError(error)) {
      log.warn("getBlogs: backend offline — using demo blogs")
    } else {
      log.error("getBlogs failed", error instanceof Error ? error.message : error)
    }
    return { data: [] }
  }
}

export const getBlogById = async (id: string) => {
  try {
    const data = await PublicServerFetchJson(`/platform/blogs/${id}`)
    return data
  } catch (error) {
    if (isBackendOfflineError(error)) {
      log.warn(`getBlogById(${id}): backend offline`)
    } else {
      log.error(`getBlogById(${id}) failed`, error instanceof Error ? error.message : error)
    }
    return { data: null }
  }
}
