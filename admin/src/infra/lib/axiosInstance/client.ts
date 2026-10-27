import envConfig from "@/src/infra/config";
import axios from "axios";
import { getCookie } from "@/src/shared/utils/cookie-utils";

const axiosInstanceClient = axios.create({
    baseURL: envConfig.backendURL,
});

// Log the baseURL in development for debugging
if (process.env.NODE_ENV === 'development') {
    console.log('Axios Client baseURL:', envConfig.backendURL);
}

axiosInstanceClient.interceptors.request.use(
    function (config) {
        let accessToken = getCookie("accessToken") || getCookie("token") || getCookie("auth_token");
        if (!accessToken && typeof window !== 'undefined') {
            accessToken = localStorage.getItem("accessToken") || localStorage.getItem("token");
        }
        // Only attach Authorization if it isn't already explicitly set
        if (accessToken && !(config.headers && "Authorization" in config.headers)) {
            const tokenClean = accessToken.trim();
            config.headers.Authorization = tokenClean.startsWith("Bearer ") ? tokenClean : `Bearer ${tokenClean}`;
        }
        return config;
    },
    function (error) {
        return Promise.reject(error);
    }
);

axiosInstanceClient.interceptors.response.use(
    function onFulfilled(response) {
        return response;
    },
    async function onRejected(error) {
        // In client side, 401 handling might involve redirecting to login
        // or attempting a refresh token call if implemented in client side.
        // For now, let's keep it simple.
        return Promise.reject(error);
    }
);

export default axiosInstanceClient;
