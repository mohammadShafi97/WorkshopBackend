import { model, Schema } from "mongoose";

const BlogSchema = new Schema(
  {
    author: {
      type: String,
    },
    title: {
      type: String,
    },
    content: {
      type: String,
    },
  },
  { timestamps: true }
);

const Blog = model("Blog", BlogSchema);
export default Blog;
