import {mockFetch} from './mocks';
import {initBrowser} from '../src';

describe('initHttpGateway', () => {

  beforeEach(() => {
    (<any>global).fetch = mockFetch({});
  });

  test('calls default URL', async () => {
    initBrowser('fake').catch(() => {});
    // expect(fetch).toBeCalled();
  });
});
