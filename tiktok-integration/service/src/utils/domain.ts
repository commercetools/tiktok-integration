export const extractMainDomain = (url: string) => {
  // For full domains like asdas.asdsada.blah.com
  const domainRegex =
    /^(?:https?:\/\/)?(?:.+\.)?([a-z0-9][a-z0-9-]*\.[a-z0-9][a-z0-9-]*(?:\.[a-z]{2,})?)(?:\/|$)/i;

  // For localhost or IP addresses (including subdomains for localhost)
  const localhostRegex =
    /^(?:https?:\/\/)?(?:.*\.)?(localhost(?::\d+)?)(?:\/|$)/i;

  let match = url.match(domainRegex);
  if (match && match[1]) {
    return match[1];
  }

  match = url.match(localhostRegex);
  return match ? match[1] : url;
};
