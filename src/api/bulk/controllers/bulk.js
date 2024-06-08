'use strict';
const { parseMultipartData } = require('@strapi/utils');
const csv = require('csvtojson');
const fs = require('fs');

module.exports = {
  async bulkCreate(ctx) {
    let json;

    if (ctx.is('multipart')) {
      // Parse the multipart data
      const { files } = parseMultipartData(ctx);

      if (!files || !files.file) {
        return ctx.badRequest('Please provide the CSV file in "files.file"');
      }

      // Convert the local tmp file to a buffer
      const buffer = fs.readFileSync(files.file.path);

      // Stream that file buffer into the conversion function to get usable JSON
      json = await csv({
        noheader: false,
        headers: ["name", "location_latitude", "location_longitude", "location_address", "location_city", "available_sports"],
        delimiter: ';'
      }).fromString(buffer.toString());


    } else if (ctx.is('json')) {
      // Get JSON data from the request body
      json = ctx.request.body;
    } else {
      return ctx.badRequest('Unsupported request format');
    }

    // Finally loop through the JSON and create the Strapi entries
    const createdCourts = await Promise.all(
      json.map(async court => {
        console.log(JSON.stringify(court.name, null, 2))
        return await strapi.entityService.create('api::court.court', {
          data: {
            name: court.name,
            location: {
              latitude: court.location_latitude,
              longitude: court.location_longitude,
              address: court.location_address,
              city: court.location_city,
            },
            available_sports: {sport:court.available_sports},
            amenities: [],
            // cover: ''
          }
        });
      })
    );

    return ctx.send(createdCourts);
  },
};
