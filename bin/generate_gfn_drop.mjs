import { input } from '@inquirer/prompts';
import { copyFile, readFile, writeFile, mkdir } from 'fs/promises';
import Handlebars from 'handlebars';
import Jimp from "jimp";

async function createPromissoryNote(imgPath, text) {
  const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
  const image = await Jimp.read(imgPath);

  image.print(font, 1550, 1150, text);
  await image.writeAsync(imgPath);
}

async function content(path) {  
  return await readFile(path, 'utf8');
}

// Ask the questions about the drop
const series = await input({ message: 'What is the note series? (e.g. A,B,C,etc)', default: 'A' });
const rate = parseFloat(await input({ message: 'What is the note rate? (e.g. 5.0)', default: 5.0 }));
const length = parseInt(await input({ message: 'What is the note length? (in days)', default: 60 }));

const defaultDate = new Date();
defaultDate.setDate(defaultDate.getDate() + length);
const maturityDateDefault = defaultDate.toISOString().split('T')[0]

const maturityDate = await input({ message: 'What is the maturity date? (YYYY-MM-DD)', default: maturityDateDefault });

const tokenCount = parseInt(await input({ message: 'How many tokens to be generated?', default: 10 }));

const rootPath = `./tokens/groundfloor_note_token`;
const seriesPath = `${rootPath}/drops/series-${series}`;
const promissoryNoteTemplatePath = `${rootPath}/note-template.jpeg`;

await mkdir(seriesPath, { recursive: true });

const template_source = await content(`${rootPath}/metadata-values.json.mustache`);
const template = Handlebars.compile(template_source);

for (let tokenId = 0; tokenId < tokenCount; tokenId++) {
  let tokenName = `${series}${parseInt(rate * 100)}${tokenId}`
  let data = {
    series,
    rate,
    length,
    tokenName,
    "maturityDate": `${Date.parse(maturityDate) / 1000}`,
    tokenId
  }
  let fileName = `${seriesPath}/token-${tokenId}.json`;

  let imgPath = `${seriesPath}/token-${tokenId}-promissory-note.jpeg` ;

  await copyFile(promissoryNoteTemplatePath, imgPath);
  createPromissoryNote(imgPath, `Series: ${tokenName}`);

  await writeFile(fileName, template(data));
}

console.log(`${tokenCount} tokens created. View them here: ${seriesPath}`);
