import type { UserDTO } from '../user/user.dto'
import type { CommentDTO } from '../comment/comment.dto'
import { PostModel, type PostPlainModel } from './post.model'

export class PostDTO {
  id!: string
  title!: string
  body!: string
  userId!: string
  author?: UserDTO
  comments?: CommentDTO[]

  constructor(data: Partial<PostDTO> = {}) {
    Object.assign(this, data)
  }

  toModel(): PostModel {
    return new PostModel({
      id: this.id,
      title: this.title,
      content: this.body,
      userId: this.userId,
      author: this.author?.toModel(),
      comments: this.comments?.map(e => e.toModel()),
    })
  }

  toPlainModel(): PostPlainModel {
    return {
      id: this.id,
      title: this.title,
      content: this.body,
      userId: this.userId,
      author: this.author?.toPlainModel(),
      comments: this.comments?.map(e => e.toPlainModel()),
    }
  }
}
