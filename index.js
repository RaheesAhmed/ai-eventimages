import express from "express";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import OpenAI from "openai";
import { google } from "googleapis";
import fs from "fs";
import cors from "cors";
import path from "path";
import bodyParser from "body-parser";
import sharp from "sharp";
import axios from "axios";

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

dotenv.config();

const apiKey = process.env["OPENAI_API_KEY"];
const openai = new OpenAI({ apiKey });

const port = 8000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Load the service account key JSON file
const serviceAccount = JSON.parse(
  fs.readFileSync("future4u-412121-9c3a9372690b.json")
);
const jwtClient = new google.auth.JWT(
  serviceAccount.client_email,
  null,
  serviceAccount.private_key,
  ["https://www.googleapis.com/auth/drive"]
);

// Initialize the Google Drive API client
const drive = google.drive({ version: "v3", auth: jwtClient });

const imagesDirectory = path.join(__dirname, "public", "images");

const csvFilePath = path.join(__dirname, "events-images.csv");

const savetocsv = async (
  fullName,
  email,
  mainScene,
  location,
  mainCharacter,
  additionalCharacters,
  additionalInfo,
  affirmation,
  imageUrl
) => {
  const headers =
    "First Name,Email,Main Scene,Location,Main Character,Additional Characters,Additional Info,Image Copy,Image Link,\n";
  const data = `${fullName},${email},${mainScene},${location},${mainCharacter},${additionalCharacters},${additionalInfo},${affirmation},${imageUrl}\n`;

  try {
    await fs.promises.access(csvFilePath, fs.constants.F_OK);
    console.log("CSV file exists. Appending data.");
    await fs.promises.appendFile(csvFilePath, data);
    console.log("Data appended to CSV file successfully.");
  } catch (error) {
    console.log("CSV file does not exist. Creating file.", error);
    await fs.promises.writeFile(csvFilePath, headers + data);
    console.log("CSV file created with headers and data.");
  }
};
const addTextToImage = async (imageBuffer, text) => {
  // Define the text attributes
  const svgText = `
      <svg width="1024" height="1024">
        <style>
          .title { fill: #fff; font-size: 24px; font-family: Arial, sans-serif; }
        </style>
        <text x="10" y="1014" class="title">${text}</text>
      </svg>
    `;

  // Overlay the text onto the image using sharp
  return sharp(imageBuffer)
    .composite([
      {
        input: Buffer.from(svgText),
        top: 0,
        left: 0,
        gravity: "southeast", // Position the text at the bottom right
      },
    ])
    .toBuffer();
};

const handleCSVOnGoogleDrive = async (csvFilePath) => {
  const fileName = "events-images.csv";
  const folderId = process.env.GOOGLE_FOLDER_ID;
  console.log("Uploading CSV to Google Drive. Folder ID:", folderId);

  try {
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: "text/csv",
      body: fs.createReadStream(csvFilePath),
    };

    // Check if the file already exists
    const existingFiles = await drive.files.list({
      q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
      spaces: "drive",
      fields: "files(id, name)",
    });

    if (existingFiles.data.files.length > 0) {
      // File exists, update it
      const fileId = existingFiles.data.files[0].id;
      await drive.files.update({
        fileId: fileId,
        media: media,
      });
      console.log(`Updated existing file on Google Drive with ID: ${fileId}`);
    } else {
      // File doesn't exist, upload as new
      await drive.files.create({
        resource: fileMetadata,
        media: media,
      });
      console.log("Uploaded new file to Google Drive.");
    }
  } catch (error) {
    console.error("Error uploading CSV to Google Drive:", error);
  }
};

app.post("/generate-images", async (req, res) => {
  console.log("data received:", req.body);
  try {
    const {
      fullName,
      email,
      mainScene,
      location,
      mainCharacter,
      additionalCharacters,
      additionalInfo,
      affirmation,
    } = req.body;

    const prompt = `Create an ultra-high-definition, 32k resolution cinematic still in a panoramic landscape format. The scene unfolds at ${location}, featuring a vivid portrayal of ${mainScene}. At the heart of the narrative is ${mainCharacter}. They are not solitary; embedded in the scene are characters like ${additionalCharacters}, each with their distinctive flair, together weaving a complex tapestry. To enrich the visual storytelling, incorporate elements such as ${additionalInfo}, ensuring a multi-layered and immersive experience. Let this image be a visual affirmation of the intention ${affirmation}`;

    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1792x1024",
    });

    console.log("Generated image data:", imageResponse.data);
    const imageUrl = imageResponse.data[0].url;

    // Download the generated image
    const response = await axios({
      method: "GET",
      url: imageUrl,
      responseType: "arraybuffer",
    });

    const generatedImageBuffer = Buffer.from(response.data);

    // Add text to the image
    const finalImageBuffer = await addTextToImage(
      generatedImageBuffer,
      "futureselfie.ai"
    );

    // Convert your buffer into a base64 string to send in a JSON response
    const imageBase64 = finalImageBuffer.toString("base64");

    // Send the generated image to the frontend immediately
    res.json({
      message: "Image generated successfully",
      imageData: `data:image/png;base64,${imageBase64}`,
    });

    // Handle CSV saving and Google Drive uploading in the background
    (async () => {
      const imageName = `image-${Date.now()}.png`;
      const imagePath = path.join(imagesDirectory, imageName);
      await fs.promises.writeFile(imagePath, finalImageBuffer);

      const localimageUrl = `${req.protocol}://${req.get(
        "host"
      )}/images/${imageName}`;

      await savetocsv(
        fullName,
        email,
        mainScene,
        location,
        mainCharacter,
        additionalCharacters,
        additionalInfo,
        affirmation,
        localimageUrl
      );

      // Upload the updated CSV to Google Drive
      await handleCSVOnGoogleDrive(csvFilePath);
      console.log("CSV updated and uploaded to Google Drive successfully.\n ");
    })();
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Error generating image" });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
