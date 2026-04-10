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
 * Make params into string for query params
 *
 * @param params object of key:value pairs
 *
 * @returns a string of query params that is URL safe
 */
export const getQueryString = (params: any): string => {
  let queryString = '';
  Object.keys(params || {}).forEach(key => {
    const value = params[key];
    queryString += `${key}=${encodeURIComponent(value)}&`;
  });
  return queryString.slice(0, -1);
};

/**
 * Create URL with query params if params are set
 *
 * @param url the url string
 * @param params object of key:value pairs
 *
 * @returns a string of url and query params together
 */
export const getUrlWithQueryParams = (url: string, params: any): string => {
  if (params) {
    const queryString = getQueryString(params);
    url = url + (queryString ? `?${queryString}` : '');
  }
  return url;
};

/**
 * Add required headers and additional headers together for network requests
 *
 * @param additionalHeaders object of key:value of extra header items
 *
 * @returns an object of key:value of all headers (additional and required)
 */
export const getHeaders = (additionalHeaders?: any): any => {
  const requiredHeaders: any = {
    'Content-Type': 'application/json'
  };

  Object.keys(additionalHeaders || {}).forEach(key => {
    requiredHeaders[key] = additionalHeaders[key];
  });

  return requiredHeaders;
};

/**
 * Make a GET for retrieving data from a server
 *
 * @param url the url string of the resource on the server
 * @param queryParams an object of key:value to be used for the query params
 * @param additionalHeaders an object of key:value to be used for additional headers
 *
 * @returns a promise that will resolve with the response from the server or reject if network/server error
 */
export const apiGet = (url: string, queryParams?: any, additionalHeaders?: any): Promise<any> => {
  return handlePromiseErrors(fetch(getUrlWithQueryParams(url, queryParams), {
    headers: getHeaders(additionalHeaders)
  }));
};

/**
 * Make a POST for creating data on the server
 *
 * @param url the url string of the resource on the server
 * @param data the data (JSON) to send to the server
 * @param queryParams an object of key:value to be used for the query params
 * @param additionalHeaders an object of key:value to be used for additional headers
 *
 * @returns a promise that will resolve with the response from the server or reject if network/server error
 */
export const apiPost = (url: string, data: any, queryParams?: any, additionalHeaders?: any): Promise<any> => {
  return handlePromiseErrors(fetch(getUrlWithQueryParams(url, queryParams), {
    method: 'POST',
    body: JSON.stringify(data),
    headers: getHeaders(additionalHeaders)
  }));
};

/**
 * Make a PUT for creating data on the server
 *
 * @param url the url string of the resource on the server
 * @param data the data (JSON) to send to the server
 * @param queryParams an object of key:value to be used for the query params
 * @param additionalHeaders an object of key:value to be used for additional headers
 *
 * @returns a promise that will resolve with the response from the server or reject if network/server error
 */
export const apiPut = (url: string, data: any, queryParams?: any, additionalHeaders?: any): Promise<any> => {
  return handlePromiseErrors(fetch(getUrlWithQueryParams(url, queryParams), {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: getHeaders(additionalHeaders)
  }));
};

/**
 * Make a DELETE on a resource on the server
 *
 * @param url the url string of the resource on the server
 * @param queryParams an object of key:value to be used for the query params
 * @param additionalHeaders an object of key:value to be used for additional headers
 *
 * @returns a promise that will resolve with the response from the server or reject if network/server error
 */
export const apiDelete = (url: string, queryParams?: any, additionalHeaders?: any): Promise<any> => {
  return handlePromiseErrors(fetch(getUrlWithQueryParams(url, queryParams), {
    method: 'DELETE',
    headers: getHeaders(additionalHeaders)
  }));
};

export default {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  getHeaders,
  getUrlWithQueryParams,
  getQueryString,
  handlePromiseErrors
};
