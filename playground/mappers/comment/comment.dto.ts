import type { PostDTO } from '../post/post.dto'
import { CommentModel, type CommentPlainModel } from './comment.model'

export class CommentDTO {
  id!: string
  name!: string
  email!: string
  body!: string
  post?: PostDTO

  constructor(data: Partial<CommentDTO> = {}) {
    Object.assign(this, data)
  }

  toModel(): CommentModel {
    return new CommentModel({
      id: this.id,
      name: this.name,
      email: this.email,
      content: this.body,
      post: this.post?.toModel(),
    })
  }

  toPlainModel(): CommentPlainModel {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      content: this.body,
      post: this.post?.toPlainModel(),
    }
  }
}
