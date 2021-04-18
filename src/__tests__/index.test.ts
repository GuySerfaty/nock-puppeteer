import * as puppeteer from 'puppeteer';
import { Page, Browser } from 'puppeteer';
import * as nock from 'nock';
import {
  MOCK_PAGE_PATH, DEFAULT_PP_CONFIG
} from './const';
const useNock = require('../');

// const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const getSelectorText = async (page: any, selector: string) => {
  await page.waitForSelector(selector);
  const element = await page.$(selector);
  return page.evaluate((pageElement: any) => pageElement.innerText, element);
}

let browser: Browser;
let page: Page;

describe('Basic functionality', () => {
  beforeAll(async () => {
    browser = await puppeteer.launch(DEFAULT_PP_CONFIG);
    page = await browser.newPage();
  })
  
  it('Basic Mock', async () => {
    useNock(page, ['https://example.com/api'])
    
    const mockProducts = [{id: 1, product: 'A'}, {id: 2, product: 'B'}];
    await nock('https://example.com/api')
      .get('/api/products')
      .reply(200, mockProducts);
  
    await page.goto(MOCK_PAGE_PATH);
    const firstText = await getSelectorText(page, '.product-row')
    expect(firstText).toBe(mockProducts[0].product)
  
    await nock('https://example.com/api')
      .get('/api/products')
      .reply(200, [mockProducts[1]]);
  
    await page.goto(MOCK_PAGE_PATH);
    const secondText = await getSelectorText(page, '.product-row')
    expect(secondText).toBe(mockProducts[1].product)
    await browser.close();
  });
})


