const { Command } = require("commander");
const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const multer = require("multer");
const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUI = require("swagger-ui-express");

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

const getNotePath = (noteName) => path.join(cache, `${noteName}.txt`);

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

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Note Management API",
      version: "1.0.0",
      description: "API for managing notes",
    },
  },
  apis: [__filename],
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);
app.use("/docs", swaggerUI.serve, swaggerUI.setup(swaggerDocs));

/**
 * @swagger
 * /notes:
 *  get:
 *    summary: Retrieve all notes
 *    tags: [Notes]
 *    responses:
 *      200:
 *        description: A list of notes
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                type: object
 *                properties:
 *                  name:
 *                    type: string
 *                  text:
 *                    type: string
 */
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

/**
 * @swagger
 * /notes/{noteName}:
 *  get:
 *    summary: Retrieve a single note by name
 *    tags: [Notes]
 *    parameters:
 *      - name: noteName
 *        in: path
 *        required: true
 *        description: Name of the note
 *        schema:
 *          type: string
 *    responses:
 *      200:
 *        description: The note content
 *      404:
 *        description: Note not found
 */
app.get("/notes/:noteName", (req, res) => {
  const content = fetchNote(req.params.noteName);
  if (!content) return res.status(404).send("Note not found");
  res.status(200).send(content);
});

/**
 * @swagger
 * /write:
 *  post:
 *    summary: Create a new note
 *    tags: [Notes]
 *    requestBody:
 *      required: true
 *      content:
 *        multipart/form-data:
 *          schema:
 *            type: object
 *            properties:
 *              note_name:
 *                type: string
 *                description: Name of the note
 *              note:
 *                type: string
 *                description: Content of the note
 *    responses:
 *      201:
 *        description: Note successfully created
 *      400:
 *        description: Note already exists
 */
app.post("/write", multer().none(), (req, res) => {
  const { note_name, note } = req.body;
  if (fetchNote(note_name)) return res.status(400).send("Note already exists");
  saveNote(note_name, note);
  res.status(201).send("Note successfully created");
});

/**
 * @swagger
 * /notes/{noteName}:
 *  delete:
 *    summary: Delete a note
 *    tags: [Notes]
 *    parameters:
 *      - name: noteName
 *        in: path
 *        required: true
 *        description: Name of the note
 *        schema:
 *          type: string
 *    responses:
 *      200:
 *        description: Note successfully deleted
 *      404:
 *        description: Note not found
 */
app.delete("/notes/:noteName", (req, res) => {
  const noteName = req.params.noteName;
  if (!fetchNote(noteName)) return res.status(404).send("Note not found");
  removeNote(noteName);
  res.sendStatus(200);
});

/**
 * @swagger
 * /notes/{noteName}:
 *  put:
 *    summary: Update a note
 *    tags: [Notes]
 *    parameters:
 *      - name: noteName
 *        in: path
 *        required: true
 *        description: Name of the note
 *        schema:
 *          type: string
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              noteContent:
 *                type: string
 *    responses:
 *      200:
 *        description: Note successfully updated
 *      404:
 *        description: Note not found
 */
app.put("/notes/:noteName", multer().none(), (req, res) => {
  const noteName = req.params.noteName;
  const { noteContent } = req.body;

  if (!fetchNote(noteName)) {
    return res.status(404).send("Note does not exist");
  }

  saveNote(noteName, noteContent);
  res.status(200).send("Note successfully updated");
});

/**
 * @swagger
 * /UploadForm.html:
 *  get:
 *    summary: Serve the upload form
 *    tags: [Form]
 *    responses:
 *      200:
 *        description: Form served successfully
 *      500:
 *        description: Error serving the form
 */
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
