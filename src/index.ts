import * as http from 'http';
import * as https from 'https';
import { Page, HTTPRequest, ResourceType, ResponseForRequest } from 'puppeteer';

const isUtf8Representable = function(buffer: Buffer) {
  const utfEncodedBuffer = buffer.toString('utf8')
  const reconstructedBuffer = Buffer.from(utfEncodedBuffer, 'utf8')
  return reconstructedBuffer.equals(buffer)
}

const getRequestHandler = (allowedHosts: string[], supportedResourceTypes = ['xhr', 'fetch', 'document']) => (interceptedRequest: HTTPRequest) => {
  const url: string = interceptedRequest.url();
  if (
    !supportedResourceTypes.includes(interceptedRequest.resourceType()) ||
    !allowedHosts.find((allowedHost) => url.includes(allowedHost))
  ) {
    return interceptedRequest.continue();
  }
  new Promise<Partial<ResponseForRequest>>((resolve, reject) => {
    let protocol: any = http;
    if (url.includes('https://')) {
      protocol = https;
    }
    const req: http.ClientRequest = protocol.request(url, {
      method: interceptedRequest.method().toLowerCase(),
      headers: interceptedRequest.headers(),
    });
    req.on('error', (e) => {
      return reject(e);
    });

    req.on('response', (response) => {
      const chunks: Uint8Array[] = [];
      response.on('data', (chunk) => {
        chunks.push(chunk);
      });
      response.on('end', () => {
        var mergedBuffer = Buffer.concat(chunks);
        var isBinary = !isUtf8Representable(mergedBuffer);
        var data = null;
        if (!isBinary) {
          data = mergedBuffer.toString('utf8');
        } else {
          data = mergedBuffer;
        }

        const resolveValue = {
          body: data,
          status: response.statusCode,
          headers: response.headers as Record<string, string>,
        };
        resolve(resolveValue);
      });
    });

    const postData = interceptedRequest.postData();
    if (postData) {
      req.write(postData);
    }
    req.end();
  })
    .then((value) => {
      return interceptedRequest.respond(value);
    })
    .catch((e) => {
      // console.log('Error got', e);
      interceptedRequest.abort();
      throw e;
    });
};

module.exports = async (page: Page, allowedHosts: string[], supportedResourceTypes?: ResourceType[]) => {
  await page.setRequestInterception(true);
  page.on('request', getRequestHandler(allowedHosts, supportedResourceTypes));
};
