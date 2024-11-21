const { Command } = require("commander");
const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const multer = require("multer");

const app = express();
app.use(bodyParser.json());

const program = new Command();

program
  .requiredOption("-h, --host <host>", "server host")
  .requiredOption("-p, --port <port>", "server port")
  .requiredOption("-c, --cache <cache>", "cache directory")
  .parse(process.argv);

const { host, port, cache } = program.opts();

if (!host) {
  console.error("Error: input host");
  return;
}

if (!port) {
  console.error("Error: input port");
  return;
}

if (!cache) {
  console.error("Error: input cache");
  return;
}

const getNotePath = (noteName) => {
  return path.join(cache, `${noteName}.txt`);
};

const fetchNote = (noteName) => {
  try {
    const notePath = getNotePath(noteName);
    return fs.existsSync(notePath) ? fs.readFileSync(notePath, "utf8") : null;
  } catch (error) {
    console.error("Error reading note:", error);
    return null;
  }
};

const saveNote = (noteName, content) => {
  try {
    const notePath = getNotePath(noteName);
    fs.writeFileSync(notePath, content, "utf8");
  } catch (error) {
    console.error("Error writing note:", error);
  }
};

const removeNote = (noteName) => {
  try {
    const notePath = getNotePath(noteName);
    if (fs.existsSync(notePath)) fs.unlinkSync(notePath);
  } catch (error) {
    console.error("Error deleting note:", error);
  }
};

app.get("/notes", (req, res) => {
  const notesList = fs
    .readdirSync(cache)
    .filter((filename) => filename.endsWith(".txt"))
    .map((filename) => {
      const name = filename.replace(/\.txt$/, "");
      const text = fetchNote(name);
      return { name, text };
    });
  res.status(200).json(notesList);
});

app.get("/notes/:noteName", (req, res) => {
  const content = fetchNote(req.params.noteName);
  if (!content) return res.status(404).send("Note not found");
  res.status(200).send(content);
});

app.post("/write", multer().none(), (req, res) => {
  const { note_name, note } = req.body;
  if (fetchNote(note_name)) return res.status(400).send("Note already exists");
  saveNote(note_name, note);
  res.status(201).send("Note successfully created");
});

app.delete("/notes/:noteName", (req, res) => {
  const noteName = req.params.noteName;
  if (!fetchNote(noteName)) return res.status(404).send("Note not found");
  removeNote(noteName);
  res.sendStatus(200);
});

app.put("/notes/:noteName", multer().none(), (req, res) => {
  const noteName = req.params.noteName;
  const { noteContent } = req.body;

  if (!fetchNote(noteName)) {
    return res.status(404).send("Note does not exist");
  }

  saveNote(noteName, noteContent);
  res.status(200).send("Note successfully updated");
});

app.get("/UploadForm.html", (req, res) => {
  const filePath = path.resolve(__dirname, "UploadForm.html");
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error("Error serving the file:", err);
      res.status(500).send("An error occurred while serving the file.");
    }
  });
});

app.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});
