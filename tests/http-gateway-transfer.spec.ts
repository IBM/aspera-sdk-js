jest.mock('../src/index', () => ({asperaSdk: {}}));

import {getSdkTransfer} from '../src/http-gateway/core';

describe('getSdkTransfer', () => {
  test('starts as initiating with the same previous status', () => {
    const transfer = getSdkTransfer({});
    expect(transfer.status).toBe('initiating');
    expect(transfer.previous_status).toBe('initiating');
  });

  test('previous_status follows each status change', () => {
    const transfer = getSdkTransfer({});

    transfer.status = 'running';
    expect(transfer.previous_status).toBe('initiating');

    transfer.status = 'completed';
    expect(transfer.status).toBe('completed');
    expect(transfer.previous_status).toBe('running');
  });

  test('setting the same status keeps previous_status', () => {
    const transfer = getSdkTransfer({});

    transfer.status = 'running';
    transfer.status = 'running';
    expect(transfer.previous_status).toBe('initiating');
  });

  test('status and previous_status are copied when the transfer is spread', () => {
    const transfer = getSdkTransfer({});
    transfer.status = 'running';
    transfer.status = 'failed';

    expect({...transfer}).toMatchObject({status: 'failed', previous_status: 'running'});
  });
});
