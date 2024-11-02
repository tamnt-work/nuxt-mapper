import type { PostModel } from '../post/post.model'

export class CommentModel {
  id!: string
  name!: string
  email!: string
  content!: string
  post?: PostModel

  constructor(data: Partial<CommentModel> = {}) {
    Object.assign(this, data)
  }
}

export type CommentPlainModel = Omit<CommentModel, 'constructor'>
