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
  });
  


