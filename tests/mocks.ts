export const mockFetch = (data: any) =>  {
  const returnPromise = new Promise(resolver => {
    resolver({});
  });
  return jest.fn().mockImplementation(() => {
    let localResolve;
    const testPromise = new Promise(resolver => {
      localResolve = resolver;
    });

    Promise.resolve({
      ok: true,
      json: () => returnPromise.catch(() => {})
    });

    return testPromise;
  });
};
