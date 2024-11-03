import { useApi } from '../api'
import type { UseFetchOptions } from '#app'
import { UserDTO } from '~/mappers/user/user.dto'
import type { UserPlainModel } from '~/mappers/user/user.model'
import type { CreateUserRequest } from '~/mappers/user/requests/create-user.request'
import type { UpdateUserRequest } from '~/mappers/user/requests/update-user.request'

const prefix = '/users'

export const useUserService = () => {
  return {
    all: (options: UseFetchOptions<UserPlainModel[]> = {}) => {
      return useApi<UserPlainModel[]>().get(prefix, {
        transform: (data: object[]) => {
          return data.map((user: object) => new UserDTO(user).toPlainModel())
        },
        ...options,
      })
    },

    find: (id: string, options: UseFetchOptions<UserPlainModel> = {}) => {
      return useApi<UserPlainModel>().get(`${prefix}/${id}`, {
        transform: (data: object) => {
          return new UserDTO(data).toPlainModel()
        },
        ...options,
      })
    },

    create: (data: CreateUserRequest, options: UseFetchOptions<UserPlainModel> = {}) => {
      return useApi<UserPlainModel>().post(prefix, {
        body: data,
        transform: (data: object) => {
          return new UserDTO(data).toPlainModel()
        },
        ...options,
      })
    },

    update: (id: string, data: UpdateUserRequest, options: UseFetchOptions<UserPlainModel> = {}) => {
      return useApi<UserPlainModel>().put(`${prefix}/${id}`, {
        body: data,
        transform: (data: object) => {
          return new UserDTO(data).toPlainModel()
        },
        ...options,
      })
    },

    delete: (id: string, options: UseFetchOptions<UserPlainModel> = {}) => {
      return useApi<UserPlainModel>().destroy(`${prefix}/${id}`, {
        transform: (data: object) => {
          return new UserDTO(data).toPlainModel()
        },
        ...options,
      })
    },
  }
}
