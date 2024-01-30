import { input } from '@inquirer/prompts';
import { copyFile, readFile, writeFile, mkdir } from 'fs/promises';
import Handlebars from 'handlebars';
import Jimp from "jimp";
import 'dotenv/config';
import pinataSDK from '@pinata/sdk';
import crypto from 'crypto';

const pinata = new pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_KEY);

/////////////////// Ask the questions about the drop
const series = await input({ message: 'What is the lro series? (e.g. A,B,C,etc)', default: 'B' });
const externalUrl = await input({ message: 'What is the external url for this series?', default: 'https://crypto.groundfloor.com/nft' });
const name = await input({ message: 'What is the name of the property?', default: '1703 Bryden Rd' });
const address1 = await input({ message: 'What is the address 1 of the property?', default: name });
const address2 = await input({ message: 'What is the address 2 of the property?', default: 'Columbus OH, 43205' });
const loanAmount = parseFloat(await input({ message: 'What is the loan amount for this token? (e.g. 40000.00)', default: 40000.00 }));
const purpose = await input({ message: 'What is the purpose of this loan?', default: 'Refinance - Rehab' });
const securityPosition = await input({ message: 'What is the security position of this loan? (e.g. First Lien)', default: 'First Lien' });
const amount = parseFloat(await input({ message: 'What is the investment amount for this token? (e.g. 1000.00)', default: 1000.00 }));
const rate = parseFloat(await input({ message: 'What is the lro rate? (e.g. 5.0)', default: 12.0 }));
const term = parseInt(await input({ message: 'What is the lro term? (e.g. 12)', default: 15 }));
const ltarv = parseFloat(await input({ message: 'What is the LT Arv? (e.g. 72.3)', default: 68.6 }));
const loanId = parseInt(await input({ message: 'What is the lro id? (ActiveAdmin Id)', default: 13994 }));
const assetUrl = await input({ message: 'What is the asset url for this property? (e.g. AA preview page)', default: 'https://www.groundfloor.us/investments/la_c0bf5ef67548/preview' });
const investmentDate = await input({ message: 'What is the investment date? (YYYY-MM-DD)', default: '2023-10-09' });
const maturityDate = await input({ message: 'What is the maturity date? (YYYY-MM-DD)', default: '2024-05-22' });
const tokenCount = parseInt(await input({ message: 'How many tokens to be generated?', default: 2 }));
const offeringCircular = await input({ message: 'What is the url for the offering circular?', default: 'https://www.sec.gov/Archives/edgar/data/1588504/000114420418000003/tv482169_partiiandiii.htm' });

// Computational values
const maxSeriesDigits = 4;
const maxTokenDigits = 5;
const address = `${address1}, ${address2}`;
const days = Math.round((new Date(maturityDate) - new Date(investmentDate)) / (1000 * 60 * 60 * 24));
const expectedReturn = parseFloat((amount * (1 + (rate / 100) * (days / 360))).toFixed(2));

const amountUSD = (amount).toLocaleString('en-US', {style: 'currency', currency: 'USD'});
const returnUSD = (expectedReturn).toLocaleString('en-US', {style: 'currency',currency: 'USD'});
const loanAmountUSD = (loanAmount).toLocaleString('en-US', {style: 'currency',currency: 'USD'});

/////////////////// Paths and setup
const seriesID = `${series.padStart(maxSeriesDigits, '0')}-${loanId}`;
const rootPath = `./tokens/lro-token`;
const seriesPath = `${rootPath}/drops/GLRT-${seriesID}`;
const imagePath = `${seriesPath}/GLRT-${seriesID}-images`;
const metadataPath = `${seriesPath}/GLRT-${seriesID}-metadata`;
const lroTemplatePath = `${rootPath}/lro-template.jpeg`;

await mkdir(imagePath, { recursive: true });
await mkdir(metadataPath, { recursive: true });

const uuids = [];
const template_source = await content(`${rootPath}/metadata-values.json.mustache`);
const template = Handlebars.compile(template_source);
const font32 = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
const font16 = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);

/////////////////// Helper functions
let USDollar = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

async function createLroToken(imgPath, dna) {
  const image = await Jimp.read(imgPath);
  const totalH = image.bitmap.height; 
  
  let startX = 25;
  let startY = (totalH - 265);
  let ts = 20; // text spacing
  let bs = 30; // box spacing

  // Details Box
  image.print(font32, startX, startY, name);

  // Reset Y Postion for Details
  startX += 5;
  startY += bs;

  image.print(font16, startX, startY += ts, `Amount: ${amountUSD}`);
  image.print(font16, startX, startY += ts, `Expected Payout: ${returnUSD}`);
  image.print(font16, startX, startY += ts, `Interest Rate: ${rate}%`);
  image.print(font16, startX, startY += ts, `Matures: ${maturityDate}`);
  image.print(font16, startX, startY += ts, `Purpose: ${purpose}`);

  // Reset Y Postion for Address and DNA boxes
  startY += bs + 10;

  // Address Box
  image.print(font16, startX, startY, 'Address:');
  image.print(font16, startX, startY + (ts * 1), address1);
  image.print(font16, startX, startY + (ts * 2), address2);

  // DNA Box
  startX += 260; // Reset X positioin
  image.print(font16, startX, startY + (ts * 1), 'DNA:');
  image.print(font16, startX, startY + (ts * 2), dna);

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
  let dna = `${seriesID}-${tokenId.toString().padStart(maxTokenDigits, '0')}`;

  // Create image
  let imgPath = `${imagePath}/GLRT-${dna}.jpeg` ;
  await copyFile(lroTemplatePath, imgPath);
  await createLroToken(imgPath, dna);
}

let pinataRes = await sendToPinata(imagePath, { seriesID });
const folderCID = pinataRes.IpfsHash

for (let tokenId = 0; tokenId < tokenCount; tokenId++) {
  let dna = `${seriesID}-${tokenId.toString().padStart(maxTokenDigits, '0')}`;
  let tokenName = `Groundfloor LRO Redemption Token (GLRT) - ${series.padStart(maxSeriesDigits, '0')}`
  let uuid = crypto.randomUUID();
  uuids.push(uuid);

  // Create json file
  let data = {
    dna,
    series,
    externalUrl,
    tokenName,
    address,
    amountUSD,
    returnUSD,
    loanAmountUSD,
    purpose,
    securityPosition,
    amount,
    rate,
    term,
    ltarv,
    loanId,
    assetUrl,
    investmentDate,
    maturityDate,
    tokenCount,
    offeringCircular ,
    tokenName,
    tokenId,
    uuid,
    "imageUrl": `${process.env.IPFS_GATEWAY}/ipfs/${folderCID}/GLRT-${dna}.jpeg`,
  }
  let filePath = `${metadataPath}/GLRT-${dna}.json`;
  await writeFile(filePath, template(data));
}
await sendToPinata(metadataPath, { seriesID });

console.log(`${tokenCount} tokens created. View them here: ${seriesPath}`);
