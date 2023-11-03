import { JSONRPCErrorException } from 'json-rpc-2.0';
import {errorLog, generateErrorBody, generatePromiseObjects, isValidTransferSpec, isValidURL} from '../src/helpers/helpers';
import {TransferSpec} from '../src/models/models';

describe('generatePromiseObjects', () => {

  test('returns object containg promise, rejecter and resolver', () => {
    const promiseItem = generatePromiseObjects();
    expect(typeof promiseItem.promise.then).toBe('function');
    expect(typeof promiseItem.resolver).toBe('function');
    expect(typeof promiseItem.rejecter).toBe('function');
  });
});

describe('errorLog', () => {

  beforeEach(() => {
    (<any>window).asperaDesktopLogs = undefined;
    jest.spyOn(global.console, 'warn');
  });

  test('with message and no debug data should store in array and console', () => {
    const consoleWarnCall = jest.fn();
    console.warn = consoleWarnCall;
    const testMessage = 'Test message';
    expect((<any>window).asperaDesktopLogs).toBe(undefined);
    errorLog(testMessage);
    expect(console.warn).toBeCalled();
    expect((<any>window).asperaDesktopLogs[0].message).toBe(testMessage);
    expect((<any>window).asperaDesktopLogs[0].debugData).toBe(undefined);
  });

  test('with message and debug data should store in array and console', () => {
    const testMessage = 'Test message';
    expect((<any>window).asperaDesktopLogs).toBe(undefined);
    errorLog(testMessage, {error: true});
    expect(console.warn).toBeCalled();
    expect((<any>window).asperaDesktopLogs[0].message).toBe(testMessage);
    expect((<any>window).asperaDesktopLogs[0].debugData.error).toBe(true);
  });
});

describe('generateErrorBody', () => {

  test('should return error object without debugData if nothing is passed', () => {
    const errorResponse = generateErrorBody('testing');
    expect(errorResponse.message).toBe('testing');
    expect(errorResponse.error).toBe(true);
    expect(errorResponse.debugData).toBe(undefined);
  });

  test('should return error object with debugData if data is passed', () => {
    const errorTest = new JSONRPCErrorException('testing error body', -32002, {foo: 'bar'});
    const errorResponse = generateErrorBody('testing', errorTest);
    expect(errorResponse.message).toBe('testing');
    expect(errorResponse.error).toBe(true);
    expect(errorResponse.debugData.message).toBe('testing error body');
    expect(errorResponse.debugData.code).toBe(-32002);
    expect(errorResponse.debugData.data).toStrictEqual({foo: 'bar'});
  });
});

describe('isValidTransferSpec', () => {
  const transferSpec: TransferSpec = {
    authentication: 'token',
    paths: [
      {
        source: '/foo'
      }
    ],
    direction: 'receive',
    remote_host: 'localhost'
  };
  const invalidTransferSpecs: any[] = [
    null,
    undefined,
    'transfer',
    85
  ];

  test('should return true if valid transferSpec', () => {
    expect(isValidTransferSpec(transferSpec)).toBe(true);
  });

  test('should return false if invalid transferSpec', () => {
    invalidTransferSpecs.forEach(element => {
      expect(isValidTransferSpec(element)).toBe(false);
    });
  });
});

describe('isValidURL', () => {
  const validUrls = [
    'http://www.aspera.us',
    'https://www.aspera.us',
    'https://aspera.us',
    'https://aspera.us/aspera/desktop/latest.json',
    'https://aspera.us///aspera/desktop',
  ];
  const invalidUrls = [
    'aspera.us',
    '/aspera/desktop',
    'aspera',
  ];

  test('should return true if valid url', () => {
    validUrls.forEach(url => {
      expect(isValidURL(url)).toBe(true);
    });
  });

  test('should return false if invalid url', () => {
    invalidUrls.forEach(url => {
      expect(isValidURL(url)).toBe(false);
    });
  });
});

