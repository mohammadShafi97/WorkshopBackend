import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import Blog from "./models/Blog.js";
import cors from "cors";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: "*", // Allow all origins
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Optional: Pre-flight for all routes
app.options("/*path", cors());

app.get("/", async (req, res) => {
  try {
    const blogs = await Blog.find();
    if (blogs.length < 1) throw new Error("No Blogs found");
    res.status(200).json({ blogs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) throw new Error("No Blog Found");
    res.status(200).json({ blog });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/", async (req, res) => {
  try {
    const { author, title, content } = req.body;
    if (!author || !title || !content)
      throw new Error("Please fill in all the required fields");
    const newBlog = new Blog({
      author: author,
      title: title,
      content: content,
    });
    await newBlog.save();
    res.status(201).json({ msg: "successfully created", newBlog });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { author, title, content } = req.body;
    if (!author || !title || !content)
      throw new Error("Please fill in all the required fields");
    const blog = await Blog.findById(id);
    if (!blog) throw new Error("No Blog Found");
    blog.author = author;
    blog.title = title;
    blog.content = content;
    await blog.save();
    res.status(200).json({ msg: "successfully updated blog", blog });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/:id", async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) throw new Error("No Blogs Found");
    res.status(200).json({ msg: "Deleted Blogs", blog });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use("/*path", (req, res) => {
  res.status(404).json({ msg: "Not Found" });
});

try {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Database connected successfully");
  app.listen(port, () => {
    console.log(`Server started running on port ${port}`);
  });
} catch (error) {
  console.log(error);
  process.exit(1);
}
