import {httpClient} from './http-client';
import {safariClient} from './safari-client';
import {isSafari} from '../helpers';

interface Client {
  request(method: String, payload?: any): Promise<any>;
}

export const client: Client = isSafari() ? safariClient : httpClient;

export default Client;
