export class CookieExpiredError extends Error {
  constructor(message = "COOKIE_EXPIRED") {
    super(message);
    this.name = "CookieExpiredError";
  }
}

export class OperationTimeoutError extends Error {
  constructor(message = "OPERATION_TIMEOUT") {
    super(message);
    this.name = "OperationTimeoutError";
  }
}

export class ScrapingBlockedError extends Error {
  constructor(message = "SCRAPING_BLOCKED") {
    super(message);
    this.name = "ScrapingBlockedError";
  }
}

export class RateLimitedError extends Error {
  constructor(message = "RATE_LIMITED") {
    super(message);
    this.name = "RateLimitedError";
  }
}
