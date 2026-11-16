const pendingGetRequests = new Map<string, Promise<Response>>();

export function fetchGet(url: string): Promise<Response> {
  const pendingRequest = pendingGetRequests.get(url);

  if (pendingRequest) {
    return pendingRequest.then((response) => response.clone());
  }

  const request = fetch(url);
  pendingGetRequests.set(url, request);

  const clearRequest = () => {
    if (pendingGetRequests.get(url) === request) {
      pendingGetRequests.delete(url);
    }
  };

  void request.then(clearRequest, clearRequest);

  return request.then((response) => response.clone());
}
