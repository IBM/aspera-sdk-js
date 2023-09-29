import {apiGet} from '../src/helpers/http';
import {mockFetch} from './mocks';

describe('apiGet', () => {

  beforeEach(() => {
    (<any>global).fetch = mockFetch({});
  });

  test('GET should call url', () => {
    apiGet('aspera.us');
    expect(fetch).toHaveBeenCalledWith('aspera.us', {headers: {'Content-Type': 'application/json'}});
  });
});
