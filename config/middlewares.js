module.exports = [
  'strapi::logger',
  'strapi::errors',
  {
    name: "strapi::security",
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "connect-src": ["'self'", "https:"],
          "img-src": [
            "'self'",
            "data:",
            "blob:",
            "strapi.io",
            "sparring.s3.nyc3.amazonaws.com",
            "https://sparring.s3.nyc3.amazonaws.com"
          ],
          "media-src": [
            "'self'",
            "data:",
            "blob:",
            "strapi.io",
            "sparring.s3.nyc3.amazonaws.com",
            "https://sparring.s3.nyc3.amazonaws.com"
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
