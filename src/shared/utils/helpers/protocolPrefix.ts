import { appConfig } from '../../config';

const { protocolPrefixHttps, protocolPrefixHttp, doiPrefix, rorPrefix, orcidPrefix } = appConfig.validations;

export const getProtocolPrefix = (url: string) => {
  return url.startsWith(protocolPrefixHttps) ? protocolPrefixHttps : protocolPrefixHttp;
};

export const removePrefix = (url: string) => {
  return url
    .replace(doiPrefix, '')
    .replace(rorPrefix, '')
    .replace(orcidPrefix, '')
    .replace(protocolPrefixHttps, '')
    .replace(protocolPrefixHttp, '');
};
