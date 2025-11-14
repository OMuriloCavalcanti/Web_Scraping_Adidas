const puppeteer = require("puppeteer");
const fs = require('fs');
const arquivoJSON = 'tenis.json';
const url = "https://www.adidas.com.br/calcados";
let allTenis = [];

async function main() {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--start-maximized",
    ],
    defaultViewport: null,
  });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " + "(KHTML, like Gecko) Chrome/118.0.5993.90 Safari/537.36");
  console.log("Acessando a página da Adidas...");
  await page.goto(url, { waitUntil: "networkidle2" });
  await page.waitForSelector('#glass-gdpr-default-consent-accept-button');
  await page.click('#glass-gdpr-default-consent-accept-button');
  let pageCount = 1;
  while (true) {
    console.log(`📄 Página ${pageCount}`);
    await page.waitForSelector('.product-card_product-card-content___bjeq', { timeout: 20000 });
    await page.waitForFunction(
      () => document.querySelectorAll('.product-card_product-card-content___bjeq').length >= 0,
      { timeout: 20000 }
    );
    const tenis = await page.$$eval('.product-card_product-card-content___bjeq', cards =>
      cards.slice(0, 48).map(card => {
        const title = card.querySelector('[data-testid="product-card-title"]')?.innerText.trim();
        const categoria = card.querySelector('[data-testid="product-card-subtitle"]')?.innerText.trim();
        const img = card.querySelector('img[data-testid="product-card-primary-image"]')?.src;
        const price = card.querySelector('[data-testid="price-component"]')?.innerText.trim();
        return { title, categoria, img, price };
      })
    );
    allTenis.push(...tenis);
    console.log(`→ ${tenis.length} tênis encontrados. Total acumulado: ${allTenis.length}`);
    const nextButton = await page.$('[data-testid="pagination-next-button"]');
    if (!nextButton) {
      console.log('Nenhuma próxima página encontrada');
      break;
    }
    const nextPageLink = await page.evaluate(el => el.getAttribute('href'), nextButton);
    if (!nextPageLink) {
      break;
    }
    const absoluteLink = nextPageLink.startsWith('http') ? nextPageLink : `https://www.adidas.com.br${nextPageLink}`;
    console.log('Indo para a próxima página:', absoluteLink);
    await page.goto(absoluteLink, { waitUntil: 'networkidle2' });
    pageCount++;
  }
  const json = JSON.stringify(allTenis, null, 2);
  fs.writeFileSync(arquivoJSON, json, 'utf-8');
  console.log(`✅ Finalizado. Total de produtos: ${allTenis.length}`);
  await browser.close();
}
main();