import {mockFetch} from './mocks';
import {httpClient, getRpcServerUrl} from '../src/helpers/client/http-client';

let id = 0;

const getHeaders = () => {
  return {
    'content-type': 'application/json',
  };
};

const getMethod = () => {
  return 'POST';
};

const getBody = (method: string, params: any = {}) => {
  return JSON.stringify({
    jsonrpc: '2.0',
    id,
    method,
    params,
  });
};

const getExpectedRequest = (method: string, params: any = {}) => {
  id++;

  return {
    method: getMethod(),
    headers: getHeaders(),
    body: getBody(method, params),
  };
};

describe('request', () => {
  beforeEach(() => {
    (<any>global).fetch = mockFetch({});
  });

  const fakeData = {data: 'testing'};
  const rpcServerURL = getRpcServerUrl();

  test('POST with no params should call url with no params', () => {
    httpClient.request('fake');
    expect(fetch).toHaveBeenCalledWith(rpcServerURL, getExpectedRequest('fake'));
  });

  test('POST with params should call url with params', () => {
    httpClient.request('fake', fakeData);
    expect(fetch).toHaveBeenCalledWith(rpcServerURL, getExpectedRequest('fake', fakeData));
  });
});
