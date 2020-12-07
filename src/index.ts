import * as http from 'http';
import * as https from 'https';

const getRequestHandler = (allowedHosts: string[]) => (interceptedRequest: any) => {
  const url: string = interceptedRequest.url()
  const supportedResourceType = ['xhr', 'fetch', 'document'];
  if (!supportedResourceType.includes(interceptedRequest.resourceType()) || !allowedHosts.find(allowedHost => url.includes(allowedHost))) {
    return interceptedRequest.continue();
  }
  new Promise((resolve, reject) => {
    let protocol: any = http;
    if (url.includes('https://')) {
      protocol = https;
    }
    const req: http.ClientRequest = protocol.request(url, {
      method: interceptedRequest._method.toLowerCase(),
      headers: interceptedRequest.headers(),
    });
    req.on('error', (e) => {
      return reject(e)
    });

    req.on('response', response => {
      let data = '';      
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => {
        const resolveValue = {
          body: data,
          status: response.statusCode,
          headers: response.headers
        };
        resolve(resolveValue)
      });
    });
    
    const postData = interceptedRequest.postData();
    if (postData) {
      req.write(postData);
    }
    req.end();
  }).then(value => {
    return interceptedRequest.respond(value);
  }).catch(e => {
    // console.log('Error got', e);
    interceptedRequest.abort();
    throw e;
  })
};

module.exports = async (page: any, allowedHosts: string[]) => {
  await page.setRequestInterception(true);
  page.on('request', getRequestHandler(allowedHosts));
}
