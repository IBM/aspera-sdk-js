import { generatePromiseObjects } from './helpers';

/**
 * Check HTTP promise response for server error response (non 2XX status) and reject promise is error
 *
 * @param promise the HTTP promise to check for HTTP status code of 2XX for success
 *
 * @returns promise for the HTTP connection with catch supporting error
 */
export const handlePromiseErrors = (promise: Promise<any>): Promise<any> => {
  const promiseInfo = generatePromiseObjects();
  promise.then(response => {
    if (response.ok) {
      promiseInfo.resolver(response);
    } else {
      promiseInfo.rejecter(response);
    }
    return response;
  }).catch(error => {
    promiseInfo.rejecter(error);
  });
  return promiseInfo.promise;
};


/**
 * Make a GET for retrieving data from a server
 *
 * @param url the url string of the resource on the server
 *
 * @returns a promise that will resolve with the response from the server or reject if network/server error
 */
export const apiGet = (url: string): Promise<any> => {
  return handlePromiseErrors(fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  }));
};
