import axios from 'axios';

const isProduction = import.meta.env.VITE_ENVIRONMENT === 'production';

const axiosFetch = axios.create({
    baseURL: isProduction ? '/api' : import.meta.env.VITE_BACKEND_URL
}) 

/** request interceptor to add the access token to the request header
 *  every time a request is made
 *  the headers i in bearer token format
 * 
 *  access_token: use for authentication
 *  refresh_token: use to get a new access token
 */
axiosFetch.interceptors.request.use((config) => {
    const access_token = localStorage.getItem('access_token');
    
    if (access_token) {
        config.headers.Authorization = `Bearer ${access_token}`;
    }
    config.headers.RefreshToken = localStorage.getItem('refresh_token');

    return config
}, (error) => {
    return Promise.reject(error)
})

// every refresh deletes the old refresh token, so requests that 401 together share one refresh
let refreshing: Promise<void> | null = null

const refreshTokens = async () => {
    const response = await axiosFetch.post('/auth/refreshToken', {
        refreshToken: localStorage.getItem('refresh_token')
    })

    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('refresh_token', response.data.refresh_token);
}

axiosFetch.interceptors.response.use((response) => {
    return response
}, async(error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/refreshToken')) {
        originalRequest._retry = true;

        refreshing ??= refreshTokens().finally(() => { refreshing = null })
        await refreshing

        return axiosFetch(originalRequest);
    }

    return Promise.reject(error)
})

export default axiosFetch;