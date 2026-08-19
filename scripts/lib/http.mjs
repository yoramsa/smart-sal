import { ProxyAgent, Agent, setGlobalDispatcher } from 'undici';

const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;

if (proxy) {
  setGlobalDispatcher(new ProxyAgent({
    uri: proxy,
    requestTls: { rejectUnauthorized: false },
    connect: { rejectUnauthorized: false, timeout: 30_000 },
    connectTimeout: 30_000,
    bodyTimeout: 120_000,
    headersTimeout: 60_000,
  }));
} else {
  setGlobalDispatcher(new Agent({
    connect: { rejectUnauthorized: false, timeout: 30_000 },
    connectTimeout: 30_000,
    bodyTimeout: 120_000,
    headersTimeout: 60_000,
  }));
}

export const UA = 'Mozilla/5.0 SmartSal/1.0';
