import envConfig from "@/src/infra/config";
import axiosInstanceClient from "@/src/infra/lib/axiosInstance/client"

export interface PlatformItem {
    id: string
    title: string
    description: string
    content?: string
    priority?: string
    slug?: string
    category?: string
    tags?: string[]
    file?: any
    photo?: any
    authorId?: string
    viewCount?: number
    likeCount?: number
    isVisible: boolean
    createdAt: string
    updatedAt: string
}

const GATEWAY_URL =
    process.env.NEXT_PUBLIC_PLATFORM_GATEWAY_URL ||
    envConfig.platformBaseUrl ||
    "http://localhost:3006"

interface ServiceOptions {
    overrideAdminUrl?: string
    publicCreate?: boolean
    mapResponse?: (item: any) => PlatformItem
    useAdminPrefix?: boolean
    listFromAdmin?: boolean
}

const createPlatformService = (type: string, options: ServiceOptions = {}) => {
    const { overrideAdminUrl, publicCreate, mapResponse, useAdminPrefix = true, listFromAdmin = false } = options
    const baseRaw = overrideAdminUrl ? overrideAdminUrl : envConfig.platformBaseUrl

    const baseUrl = `${baseRaw}/${type}`
    const adminBaseUrl = useAdminPrefix ? `${baseRaw}/admin/${type}` : baseUrl


    return {
        fetchItems: async (page: number = 1, limit: number = 20): Promise<{ data: PlatformItem[], total: number }> => {
            try {
                const url = (type === "contact-us" || listFromAdmin) ? adminBaseUrl : baseUrl
                const response = await axiosInstanceClient.get(url, {
                    params: { page, limit }
                })

                let data = response.data?.data || (Array.isArray(response.data) ? response.data : [])
                if (mapResponse) data = data.map(mapResponse)

                return {
                    data,
                    total: response.data?.meta?.total || response.data?.total || (Array.isArray(response.data) ? response.data.length : (data.length || 0))
                }
            } catch (error) {
                
                return { data: [], total: 0 }
            }
        },


        //get category list
        fetchCategories: async (): Promise<{ data: string[] }> => {
            try {
                const url = (type === "contact-us" || listFromAdmin) ? adminBaseUrl : baseUrl
                const response = await axiosInstanceClient.get(`${url}/categories`)

                const payload = response.data?.data ?? response.data
                const rawCategories = Array.isArray(payload) ? payload : []
                const categories = rawCategories
                    .map((item: unknown) => (typeof item === "string" ? item.trim() : ""))
                    .filter((item: string, index: number, arr: string[]) => item.length > 0 && arr.indexOf(item) === index)

                return { data: categories }



            } catch (error) {
                console.error(`Failed to fetch ${type}:`, error)
                return { data: [] }
            }
        },

        // src/modules/dashboard/services/platform.ts
        createItem: async (data: any) => {
            const url = publicCreate ? baseUrl : adminBaseUrl
            const isFormData = typeof FormData !== "undefined" && data instanceof FormData

            return await axiosInstanceClient.post(url, data, {
                headers: isFormData
                    ? { "Content-Type": "multipart/form-data" }
                    : { "Content-Type": "application/json" },
            })
        },


        getItem: async (id: string): Promise<PlatformItem | null> => {
            try {
                const url = type === 'contact-us' ? adminBaseUrl : baseUrl
                const response = await axiosInstanceClient.get(`${url}/${id}`)
                let item = response.data?.data || (typeof response.data === 'object' && !Array.isArray(response.data) ? response.data : null)
                if (item && mapResponse) {
                    item = mapResponse(item)
                }
                return item
            } catch (error) {
                console.error(`Failed to fetch ${type} ${id}:`, error)
                return null
            }
        },

        // Inside src/modules/dashboard/services/platform.ts

       updateItem: async (id: string, data: any) => {
      const url = `${adminBaseUrl}/${id}`
      const isFormData = typeof FormData !== "undefined" && data instanceof FormData

      try {
        const response = await axiosInstanceClient.patch(url, data, {
          headers: isFormData
            ? { "Content-Type": "multipart/form-data" }
            : { "Content-Type": "application/json" },
        })
        return response.data
      } catch (error) {
        console.error(`Failed to update ${type}:`, error)
        throw error
      }
    },
        // Inside src/modules/dashboard/services/platform.ts
        deleteItem: async (id: string): Promise<void> => {
            try {
                await axiosInstanceClient.delete(`${adminBaseUrl}/${id}`)
            } catch (error) {
                console.error(`Failed to delete ${type} ${id}:`, error)
                throw error
            }
        },
        // toggleVisibility
        toggleItemVisibility: async (id: string) => {
            try {
                const url = `${adminBaseUrl}/${id}/visibility`
                const response = await axiosInstanceClient.patch(url)
                return response.data
            } catch (error) {
                console.error(`Failed to toggle visibility for ${type} ${id}:`, error)
                throw error
            }
        }
        //get category
    }
}
export const contactService = createPlatformService("contact-us" as any, { // Add 'as any' if the name isn't in your Enum
    overrideAdminUrl: `${GATEWAY_URL}/platform-service`,
    publicCreate: true,
    mapResponse: (item: any) => ({
        ...item,
        title: item.name || item.subject || "No Name",
        phone: item.phone || item.phone_number || "",
        email: item.email || "",
        message: item.message || ""
    })
})

export const noticeService = createPlatformService("notices", {
    overrideAdminUrl: `${GATEWAY_URL}/platform-service`,
    listFromAdmin: true,
    mapResponse: (item: any) => ({
        ...item,
        publishDate: item.publish_date || "",
        fileUrl: item.file || item.attachment || item.fileUrl || "",
    })
})

export const blogService = createPlatformService("blogs", {
    overrideAdminUrl: `${GATEWAY_URL}/platform-service`,
    listFromAdmin: true,
    mapResponse: (item: any) => ({
        ...item,
    })
})

export const galleryService = createPlatformService("gallery", {
    overrideAdminUrl: `${GATEWAY_URL}/platform-service`,
    listFromAdmin: true,
    mapResponse: (item: any) => ({
        ...item,
    })
})

export const teamService = createPlatformService("team", {
    overrideAdminUrl: `${GATEWAY_URL}/platform-service`,
    listFromAdmin: true,

    mapResponse: (item: any) => ({
        ...item,

    })
})
export const branchService = createPlatformService("branches", {
    overrideAdminUrl: `${GATEWAY_URL}/platform-service`,
    listFromAdmin: true,
    mapResponse: (item: any) => ({
        ...item,

    })
})
export const companyService = createPlatformService("company", {
    overrideAdminUrl: `${GATEWAY_URL}/platform-service`,
    useAdminPrefix: false,
       listFromAdmin: true,
    mapResponse: (item: any) => ({
        ...item,
    })
})

export const userService = {
    fetchUsers: async (page: number = 1, limit: number = 10, status: string = "active", search?: string, currency?: string, startDate?: string, endDate?: string) => {
        try {
            const url = `${envConfig.adminBaseUrl}/auth/admin/users`
            const params: any = { page, limit, status }
            if (search) params.search = search
            if (currency && currency !== "All") params.currency = currency
            if (startDate) params.startDate = startDate
            if (endDate) params.endDate = endDate
            const response = await axiosInstanceClient.get(url, { params })
            return response.data?.data || { users: [], pagination: { page: 1, limit: 0, total: 0, pages: 0 } }
        } catch (error) {
            console.error("Failed to fetch users:", error)
            return { users: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } }
        }
    },

    // fetch single user by id
    getUser: async (id: string) => {
        try {
            const url = `${envConfig.adminBaseUrl}/auth/admin/users/${id}`
            const response = await axiosInstanceClient.get(url)
            return response.data?.data || null
        } catch (error) {
            console.error(`Failed to fetch user ${id}:`, error)
            return null
        }
    }
}
