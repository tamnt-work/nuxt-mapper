import type { UseFetchOptions } from '#app'

export const useApi = <T = any>() => {
  const runtimeConfig = useRuntimeConfig()
  const token = useCookie('access_token')

  const config: UseFetchOptions<T> = {
    baseURL: runtimeConfig.app.baseApiUrl,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token.value ? `Bearer ${token.value}` : '',
    },
  }

  const get = (url: string, options: UseFetchOptions<T> = {}) => {
    return useFetch(url, {
      ...config,
      ...options,
    })
  }

  const post = (url: string, options: UseFetchOptions<T> = {}) => {
    return useFetch(url, {
      method: 'post',
      ...config,
      ...options,
    })
  }

  const put = (url: string, options: UseFetchOptions<T> = {}) => {
    return useFetch(url, {
      method: 'put',
      ...config,
      ...options,
    })
  }

  const patch = (url: string, options: UseFetchOptions<T> = {}) => {
    return useFetch(url, {
      method: 'patch',
      ...config,
      ...options,
    })
  }

  const destroy = (url: string, options: UseFetchOptions<T> = {}) => {
    return useFetch(url, {
      method: 'delete',
      ...config,
      ...options,
    })
  }

  return {
    get,
    post,
    put,
    patch,
    destroy,
  }
}
