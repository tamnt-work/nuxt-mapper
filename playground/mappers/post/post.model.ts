import type { UserModel } from '../user/user.model'
import type { CommentModel } from '../comment/comment.model'

export class PostModel {
  id!: string
  title!: string
  content!: string
  userId!: string
  author?: UserModel
  comments?: CommentModel[]

  constructor(data: Partial<PostModel> = {}) {
    Object.assign(this, data)
  }
}

export type PostPlainModel = Omit<PostModel, 'constructor'>
