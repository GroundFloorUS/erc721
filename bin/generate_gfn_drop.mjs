import { input } from '@inquirer/prompts';
import { copyFile, readFile, writeFile, mkdir } from 'fs/promises';
import Handlebars from 'handlebars';
import Jimp from "jimp";
import 'dotenv/config';
import pinataSDK from '@pinata/sdk';

const pinata = new pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_KEY);

/////////////////// Ask the questions about the drop
const series = await input({ message: 'What is the note series? (e.g. A,B,C,etc)', default: 'A' });
const rate = parseFloat(await input({ message: 'What is the note rate? (e.g. 5.0)', default: '5.0' }));
const length = parseInt(await input({ message: 'What is the note length? (in days)', default: 60 }));

const defaultDate = new Date();
defaultDate.setDate(defaultDate.getDate() + length);
const maturityDateDefault = defaultDate.toISOString().split('T')[0]

const maturityDate = await input({ message: 'What is the maturity date? (YYYY-MM-DD)', default: maturityDateDefault });
const tokenCount = parseInt(await input({ message: 'How many tokens to be generated?', default: 10 }));

/////////////////// Paths and setup
const seriesID = `${series}${rate * 100}`
const rootPath = `./tokens/groundfloor-note-token`;
const seriesPath = `${rootPath}/drops/GFNT-${seriesID}`;
const imagePath = `${seriesPath}/GFNT-${seriesID}-images`;
const metadataPath = `${seriesPath}/GFNT-${seriesID}-metadata`;
const promissoryNoteTemplatePath = `${rootPath}/note-template.jpeg`;

await mkdir(imagePath, { recursive: true });
await mkdir(metadataPath, { recursive: true });

const template_source = await content(`${rootPath}/metadata-values.json.mustache`);
const template = Handlebars.compile(template_source);

/////////////////// Helper functions
async function createPromissoryNote(imgPath, text) {
  const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
  const image = await Jimp.read(imgPath);

  image.print(font, 1550, 1150, text);
  await image.writeAsync(imgPath);
}

async function content(path) {
  return await readFile(path, 'utf8');
}

async function sendToPinata(path, keyvalues) {
  const options = {
    pinataMetadata: { keyvalues },
    pinataOptions: { cidVersion: 1 }
  };

  return pinata.pinFromFS(path, options);
}

/////////////////// Process tokens
for (let tokenId = 0; tokenId < tokenCount; tokenId++) {
  let tokenName = `${seriesID}${tokenId}`

  // Create imate
  let imgPath = `${imagePath}/GFNT-${tokenName}-promissory-note.jpeg` ;
  await copyFile(promissoryNoteTemplatePath, imgPath);
  await createPromissoryNote(imgPath, `Series: ${tokenName}`);
}

let pinataRes = await sendToPinata(imagePath, { seriesID });
const folderCID = pinataRes.IpfsHash

for (let tokenId = 0; tokenId < tokenCount; tokenId++) {
  let tokenName = `${seriesID}${tokenId}`

  // Create json file
  let data = {
    series,
    rate,
    length,
    tokenName,
    tokenId,
    "maturityDate": `${Date.parse(maturityDate) / 1000}`,
    "image": `${process.env.IPFS_GATEWAY}/ipfs/${folderCID}/GFNT-${tokenName}-promissory-note.jpeg`,
  }
  let filePath = `${metadataPath}/GFNT-${tokenName}-metadata.json`;
  await writeFile(filePath, template(data));
}
await sendToPinata(metadataPath, { seriesID });

console.log(`${tokenCount} tokens created. View them here: ${seriesPath}`);
