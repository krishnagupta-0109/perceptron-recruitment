// index.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const bodyParser = require("body-parser");

// Replace <username>, <password>, <cluster> with your Atlas info
const mongoURI = "mongodb+srv://krishnagupta73947:9616122477@cluster0.eqdl4vn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB connection error:", err));

// Define schema
const submissionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true
  },
  currentyear: { type: String, required: true },
  scholarNo: {
    type: String,
    required: true,
    unique: true
  },
  branch: { type: String, required: true },
  pref1: { type: String, required: true },
  pref2: { type: String, required: true },
  resume: { type: Buffer, required: true },
  message: { type: String, required: false }
});

// Create model
const Submission = mongoose.model("Submission", submissionSchema);

// ---------------- Express App ----------------
const app = express();
app.use(cors());
app.use(bodyParser.json());

// ---------------- Multer Setup ----------------
const upload = multer({ 
  limits: { fileSize: 350 * 1024 } // max 100KB
});

// ---------------- Routes ----------------

// Create new submission with custom error handling
app.post("/submissions", (req, res, next) => {
  upload.single("resume")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred during file upload.
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File is too large. Max size is 100KB." });
      }
    }
    // Pass other errors or continue to the next middleware (the route logic)
    next(err);
  });
}, async (req, res) => {
  try {
    const { name, email, currentyear, scholarNo, branch, pref1, pref2, message } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Resume file is required" });
    }

    const submission = new Submission({
      name,
      email,
      currentyear,
      scholarNo,
      branch,
      pref1,
      pref2,
      resume: req.file.buffer,
      message
    });

    await submission.save();
    res.status(201).json({ message: "Submission created", id: submission._id });
  } catch (err) {
    // Check for a Mongoose duplicate key error (code 11000)
    if (err.code === 11000) {
      return res.status(409).json({ error: "Form already filled with this email or scholar number." });
    }
    // Handle other errors
    res.status(400).json({ error: err.message });
  }
});

// Get all submissions
app.get("/submissions", async (req, res) => {
  try {
    const submissions = await Submission.find().select("-resume");
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single submission by ID
app.get("/submissions/:id", async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id).select("-resume");
    if (!submission) return res.status(404).json({ error: "Submission not found" });
    res.json(submission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download resume
app.get("/submissions/:id/resume", async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission || !submission.resume) return res.status(404).send("Resume not found");

    res.set("Content-Type", "application/pdf");
    res.set("Content-Disposition", `attachment; filename="${submission.name}_resume.pdf"`);
    res.send(submission.resume);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- Start Server ----------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
