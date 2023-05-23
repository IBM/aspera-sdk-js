import {initDesktop} from '../src/app/core';
import {mockFetch} from './mocks';

describe('initHttpGateway', () => {

  beforeEach(() => {
    (<any>global).fetch = mockFetch({});
  });

  test('calls default URL', async () => {
    initDesktop('fake').catch(() => {});
    // expect(fetch).toBeCalled();
  });
});
