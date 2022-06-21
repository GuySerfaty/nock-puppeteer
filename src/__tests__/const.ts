import * as path from 'path';

export const MOCK_PAGE_PATH: string = `file:${path.join(__dirname, 'test.html')}`;
export const DEFAULT_PP_CONFIG: any = { headless: !!process.env.CI, args: [
    '--disable-web-security',
  ]
};
