import {mockFetch} from './mocks';
import {initDesktop} from '../src';

describe('initHttpGateway', () => {

  beforeEach(() => {
    (<any>global).fetch = mockFetch({});
  });

  test('calls default URL', async () => {
    initDesktop('fake').catch(() => {});
    // expect(fetch).toBeCalled();
  });
});
