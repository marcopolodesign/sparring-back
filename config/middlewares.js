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
          "sparring.s3.nyc3.cdn.amazonaws.com",
          "https://sparring.s3.nyc3.cdn.amazonaws.com",
          "sparring.nyc3.digitaloceanspaces.com", 
          "https://sparring.nyc3.digitaloceanspaces.com" 
        ],
        "media-src": [
          "'self'",
          "data:",
          "blob:",
          "strapi.io",
          "sparring.s3.nyc3.cdn.amazonaws.com",
          "https://sparring.s3.nyc3.cdn.amazonaws.com",
          "sparring.nyc3.digitaloceanspaces.com", 
          "https://sparring.nyc3.digitaloceanspaces.com"
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
