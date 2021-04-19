
import * as puppeteer from 'puppeteer';
import * as nock from 'nock';
import * as path from 'path';
import useNock from '../';

// const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const getSelectorText = async (page: any, selector: string) => {
  await page.waitForSelector(selector);
  const element = await page.$(selector);
  return page.evaluate((pageElement: any) => pageElement.innerText, element);
}

describe('mocking', () => {

  const mockPage = `file:${path.join(__dirname, 'test.html')}`;

  let browser:any, page:any;

  beforeEach(async () => {
    browser = await puppeteer.launch({ headless: false });
    page = await browser.newPage();
  });

  afterEach(async () => {
    browser = await browser.close();
  });

  it('intercepts fetch requests', async () => {
    useNock(page, ['https://example.com/api'])

    const mockProducts = [{id: 1, product: 'A'}, {id: 2, product: 'B'}];
    await nock('https://example.com/api')
      .get('/api/products')
      .reply(200, mockProducts);

    await page.goto(mockPage);
    await page.waitForSelector('#get-products');
    await page.click('#get-products');

    const firstText = await getSelectorText(page, '.product-row')
    expect(firstText).toBe(mockProducts[0].product)

    await nock('https://example.com/api')
      .get('/api/products')
      .reply(200, [mockProducts[1]]);

    await page.goto(mockPage);
    await page.waitForSelector('#get-products');
    await page.click('#get-products');

    const secondText = await getSelectorText(page, '.product-row')
    expect(secondText).toBe(mockProducts[1].product)
  });

  it('allows browser redirects', async () => {
    useNock(page, ['https://example.com', 'https://some-auth-provider.com/authorize'])

    const redirectScope = nock('https://example.com')
      .get('/login')
      .reply(301, undefined, { 'Location': 'https://some-auth-provider.com/authorize' });

    const authScope = nock('https://some-auth-provider.com')
      .get('/authorize')
      .reply(200, {});

    await page.goto(mockPage);

    await page.click('#login');

    expect(redirectScope.isDone()).toBe(true);;
    expect(authScope.isDone()).toBe(true);;
    expect(page.url()).toEqual('https://some-auth-provider.com/authorize');
  });
});
