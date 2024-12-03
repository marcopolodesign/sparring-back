module.exports = ({ env }) => ({
    upload: {
      config: {
        provider: "aws-s3",
        providerOptions: {
          credentials: {
            accessKeyId: env("DO_SPACE_ACCESS_KEY"),
            secretAccessKey: env("DO_SPACE_SECRET_KEY"),
          },
          region: env("DO_SPACE_REGION"),
          endpoint: env("DO_SPACE_ENDPOINT"),
          params: {
            Bucket: env("DO_SPACE_BUCKET"),
          },
        },
        actionOptions: {
          upload: {},
          uploadStream: {},
          delete: {},
        },
      },
    },
    "strapi-google-auth": {
      enabled: true,
      config: {
        clientId: '589343674391-k1mtsl9qhunk1b1cgpogbgs70da4m1hg.apps.googleusercontent.com', // Replace with your Google OAuth Client ID
        clientSecret: env('GOOGLE_OAUTH_SECRET'), // Replace with your Google OAuth Client Secret
        callback: '/api/connect/google/callback', // Default callback endpoint
        successRedirect: '/', // Frontend redirect URL on success
        failureRedirect: '/login', // Frontend redirect URL on failure
      },
    },
  });
  

