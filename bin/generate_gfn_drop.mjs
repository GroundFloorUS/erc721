import { input } from '@inquirer/prompts';
import { copyFile, readFile, writeFile, mkdir } from 'fs/promises';
import Handlebars from 'handlebars';
import Jimp from "jimp";
import 'dotenv/config';
import pinataSDK from '@pinata/sdk';

const pinata = new pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_KEY);

/////////////////// Ask the questions about the drop
const series = await input({ message: 'What is the note series? (e.g. A,B,C,etc)', default: 'A' });
const rate = parseFloat(await input({ message: 'What is the note rate? (e.g. 5.0)', default: 5.0 }));
const length = parseInt(await input({ message: 'What is the note length? (in days)', default: 60 }));

const defaultDate = new Date();
defaultDate.setDate(defaultDate.getDate() + length);
const maturityDateDefault = defaultDate.toISOString().split('T')[0]

const maturityDate = await input({ message: 'What is the maturity date? (YYYY-MM-DD)', default: maturityDateDefault });
const tokenCount = parseInt(await input({ message: 'How many tokens to be generated?', default: 10 }));

/////////////////// Paths and setup
const rootPath = `./tokens/groundfloor_note_token`;
const seriesPath = `${rootPath}/drops/series-${series}`;
const promissoryNoteTemplatePath = `${rootPath}/note-template.jpeg`;

await mkdir(seriesPath, { recursive: true });

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

async function sendToPinata(name, keyvalues, path) {
  const options = {
    pinataMetadata: { name, keyvalues },
    pinataOptions: { cidVersion: 0 }
  };

  return pinata.pinFromFS(path, options);
}

/////////////////// Process tokens
for (let tokenId = 0; tokenId < tokenCount; tokenId++) {
  let tokenName = `${series}${parseInt(rate * 100)}${tokenId}`

  // Create imate
  let imgPath = `${seriesPath}/token-${tokenId}-promissory-note.jpeg` ;
  await copyFile(promissoryNoteTemplatePath, imgPath);
  await createPromissoryNote(imgPath, `Series: ${tokenName}`);
  let pinataRes = await sendToPinata(
    `GFNT-Image-${tokenName}`,
    { series, fileType: 'image' },
    imgPath
  );

  // Create json file
  let data = {
    series,
    rate,
    length,
    tokenName,
    tokenId,
    "maturityDate": `${Date.parse(maturityDate) / 1000}`,
    "image": `${process.env.IPFS_GATEWAY}/ipfs/${pinataRes.IpfsHash}`,
  }
  let filePath = `${seriesPath}/token-${tokenId}.json`;
  await writeFile(filePath, template(data));
  await sendToPinata(
    `GFNT-Metadata-${tokenName}`,
    { tokenType: 'GFNT', tokenName, fileType: 'json' },
    filePath
  );
}

console.log(`${tokenCount} tokens created. View them here: ${seriesPath}`);
