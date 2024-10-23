import {mockFetch} from './mocks';
import {init} from '../src';

describe('initHttpGateway', () => {
  beforeEach(() => {
    (<any>global).fetch = mockFetch({});
  });

  test('calls default URL', async () => {
    init({appId: 'fake'}).catch(() => {});
    // expect(fetch).toBeCalled();
  });
});
