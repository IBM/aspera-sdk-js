export const mockFetch = (data: any) =>  {
  const returnPromise = new Promise(resolver => {
    resolver(data);
  });
  return jest.fn().mockImplementation(() => {
    return Promise.resolve({
      ok: true,
      json:() => returnPromise.catch(() => {}),
    });
  });
};
