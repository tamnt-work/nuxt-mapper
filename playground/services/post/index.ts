import { useApi } from '../api'
import type { UseFetchOptions } from '#app'
import { PostDTO } from '~/mappers/post/post.dto'
import type { PostPlainModel } from '~/mappers/post/post.model'
import type { CreatePostRequest } from '~/mappers/post/requests/create-post.request'
import type { UpdatePostRequest } from '~/mappers/post/requests/update-post.request'

const prefix = '/posts'

export const usePostService = () => {
  return {
    all: (options: UseFetchOptions<PostPlainModel[]> = {}) => {
      return useApi<PostPlainModel[]>().get(prefix, {
        transform: (data: object[]) => {
          return data.map((post: object) => new PostDTO(post).toPlainModel())
        },
        ...options,
      })
    },

    find: (id: string, options: UseFetchOptions<PostPlainModel> = {}) => {
      return useApi<PostPlainModel>().get(`${prefix}/${id}`, {
        transform: (data: object) => {
          return new PostDTO(data).toPlainModel()
        },
        ...options,
      })
    },

    create: (data: CreatePostRequest, options: UseFetchOptions<PostPlainModel> = {}) => {
      return useApi<PostPlainModel>().post(prefix, {
        body: data,
        transform: (data: object) => {
          return new PostDTO(data).toPlainModel()
        },
        ...options,
      })
    },

    update: (id: string, data: UpdatePostRequest, options: UseFetchOptions<PostPlainModel> = {}) => {
      return useApi<PostPlainModel>().put(`${prefix}/${id}`, {
        body: data,
        transform: (data: object) => {
          return new PostDTO(data).toPlainModel()
        },
        ...options,
      })
    },

    delete: (id: string, options: UseFetchOptions<PostPlainModel> = {}) => {
      return useApi<PostPlainModel>().destroy(`${prefix}/${id}`, {
        transform: (data: object) => {
          return new PostDTO(data).toPlainModel()
        },
        ...options,
      })
    },
  }
}
