import { copyFile, readFile, writeFile, mkdir } from 'fs/promises';

export class Token {
  // ----------------------------------------------------------------
  // This is a bit of a cheat for time, but we are essential using "data"
  // as a dynamic set of attributes that we can use inside the class. And
  // "Token" is more of a token wrapper to create individual tokens. The 
  // original script to make the images was long, and since I wanted it 
  // in the console, I figured I would extract the token creation logic
  // from the main console script.  But it's not a true token class, it's 
  // more of a hack job.
  // Refactor: 
  //   - Create static types for all the variables to clear up the class
  public data = {};

  constructor(inputs = {}) {
    this.data = inputs;
  }

  // ----------------------------------------------------------------
  // Helper function to make this class more
  computeValues() {
    this.data.address = `${this.data.address1}, ${this.data.address2}`;
    this.data.days = Math.round((new Date(this.data.maturityDate) - new Date(this.data.investmentDate)) / (1000 * 60 * 60 * 24));
    this.data.expectedReturn = parseFloat((this.data.amount * (1 + (this.data.rate / 100) * (this.data.days / 360))).toFixed(2));
    
    this.data.amountUSD = (this.data.amount).toLocaleString('en-US', {style: 'currency', currency: 'USD'});
    this.data.returnUSD = (this.data.expectedReturn).toLocaleString('en-US', {style: 'currency',currency: 'USD'});
    this.data.loanAmountUSD = (this.data.loanAmount).toLocaleString('en-US', {style: 'currency',currency: 'USD'});

    /////////////////// Paths and setup
    this.data.seriesID = `${this.data.seriesKey}-${this.data.loanId}`;
    this.data.rootPath = `./tokens/lro-token`;
    this.data.assetPath = `./tokens/lro-token/assets`;
    this.data.coinImage = `${this.data.assetPath}/gfCoin.png`;
    this.data.seriesPath = `${this.data.rootPath}/drops/GLRT-${this.data.seriesID}`;
    this.data.imagePath = `${this.data.seriesPath}/GLRT-${this.data.seriesID}-images`;
    this.data.metadataPath = `${this.data.seriesPath}/GLRT-${this.data.seriesID}-metadata`;
    this.data.lroTemplatePath = `${this.data.rootPath}/images/${this.data.imageTemplate}`;
    this.data.template_source = `${this.data.rootPath}/metadata-values.json.mustache`;
  }

  // ----------------------------------------------------------------
  // Helper function to format dna
  dna(tokenId) {
    return `${this.data.symbol}-${this.data.seriesID}-${tokenId}`;
  }

}