import { input } from '@inquirer/prompts';
import { readFile, writeFile, mkdir } from 'fs/promises';
import Handlebars from 'handlebars';

async function content(path) {  
  return await readFile(path, 'utf8');
}

// Ask the questions about the drop
const series = await input({ message: 'What is the note series? (e.g. A,B,C,etc)' });
const rate = parseFloat(await input({ message: 'What is the note rate? (e.g. 5.0)' }));
const length = parseInt(await input({ message: 'What is the note length? (in days)' }));
const maturityDate = await input({ message: 'What is the maturity date? (YYYY-MM-DD)' });
const tokenCount = parseInt(await input({ message: 'How many tokens to be generated?' }));

const rootPath = `./tokens/groundfloor_note_token`;
const seriesPath = `${rootPath}/drops/series-${series}`;

await mkdir(seriesPath, { recursive: true })

const template_source = await content(`${rootPath}/metadata_values.json.mustache`);
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

  await writeFile(fileName, template(data));
}
