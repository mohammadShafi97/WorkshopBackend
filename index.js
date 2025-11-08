import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import Blog from "./models/Blog.js";
import cors from "cors";
import OpenAI from "openai";
import sanitizeHtml from "sanitize-html";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const openai = new OpenAI({
  apiKey: process.env.AI_API_KEY,
});

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

app.post("/generate-content", async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const prompt = `
      Write a detailed, engaging HTML blog post about: "${title}".
      Format it properly using HTML tags like <h2>, <p>, <ul>, <li>, <strong>, and <em>.
      Include a short summary (2–3 sentences) and 3 related tags.
      The response must be in valid JSON format like this:
      {
        "content": "<full blog content in HTML>",
        "summary": "<summary in plain text>",
        "tags": ["tag1", "tag2", "tag3"]
      }
      Do not include anything outside the JSON structure.
    `;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 700,
      temperature: 0.8,
    });

    const rawMessage = completion.choices[0].message.content.trim();
    let parsed;
    try {
      parsed = JSON.parse(rawMessage);
    } catch (err) {
      console.error("Failed to parse JSON:", rawMessage);
      return res.status(500).json({
        error: "Invalid JSON format returned from OpenAI",
        raw: rawMessage,
      });
    }
    const sanitizedContent = sanitizeHtml(parsed.content, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        "img",
        "h2",
        "h3",
        "h4",
        "strong",
        "em",
        "ul",
        "li",
      ]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ["src", "alt"],
      },
    });
    res.status(200).json({
      content: sanitizedContent,
      summary: parsed.summary,
      tags: parsed.tags,
    });
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
