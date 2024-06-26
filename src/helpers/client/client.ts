interface Client {
  request(method: String, payload?: any): Promise<any>;
}
