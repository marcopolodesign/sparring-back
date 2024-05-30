import type { Schema, Attribute } from '@strapi/strapi';

export interface AmmenitiesAmmenities extends Schema.Component {
  collectionName: 'components_ammenities_ammenities';
  info: {
    displayName: 'ammenities';
  };
  attributes: {};
}

export interface LocationLocation extends Schema.Component {
  collectionName: 'components_location_locations';
  info: {
    displayName: 'Location';
    icon: 'earth';
  };
  attributes: {
    latitude: Attribute.Float;
    longitude: Attribute.Float;
    address: Attribute.String;
    city: Attribute.String;
  };
}

export interface SportsSport extends Schema.Component {
  collectionName: 'components_sports_sports';
  info: {
    displayName: 'Sport';
    icon: 'typhoon';
  };
  attributes: {
    sport: Attribute.Enumeration<['Tennis', 'Paddle', 'Pickleball']>;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface Components {
      'ammenities.ammenities': AmmenitiesAmmenities;
      'location.location': LocationLocation;
      'sports.sport': SportsSport;
    }
  }
}
