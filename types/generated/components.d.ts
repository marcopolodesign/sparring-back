import type { Schema, Attribute } from '@strapi/strapi';

export interface AmmenitiesAmmenities extends Schema.Component {
  collectionName: 'components_ammenities_ammenities';
  info: {
    displayName: 'ammenities';
  };
  attributes: {};
}

export interface AttributesAttributes extends Schema.Component {
  collectionName: 'components_attributes_attributes';
  info: {
    displayName: 'attributes';
    icon: 'chartBubble';
  };
  attributes: {
    utm_term: Attribute.String;
    utm_source: Attribute.String;
    utm_campaign: Attribute.String;
    utm_medium: Attribute.String;
  };
}

export interface CoupleCouple extends Schema.Component {
  collectionName: 'components_couple_couples';
  info: {
    displayName: 'Couple';
    description: '';
  };
  attributes: {
    members: Attribute.Relation<
      'couple.couple',
      'oneToMany',
      'plugin::users-permissions.user'
    >;
    sets: Attribute.Component<'games.games', true>;
    points: Attribute.Integer;
  };
}

export interface DetailsDetails extends Schema.Component {
  collectionName: 'components_details_details';
  info: {
    displayName: 'Details';
  };
  attributes: {
    title: Attribute.Text;
    description: Attribute.Text;
  };
}

export interface GamesGames extends Schema.Component {
  collectionName: 'components_games_games';
  info: {
    displayName: 'games';
    description: '';
  };
  attributes: {
    gamesWon: Attribute.Integer;
  };
}

export interface GroupsTournamentGroupsTournament extends Schema.Component {
  collectionName: 'components_groups_tournament_groups_tournaments';
  info: {
    displayName: 'Groups Tournament';
    description: '';
  };
  attributes: {
    name: Attribute.String;
    hours: Attribute.String;
    matches: Attribute.Relation<
      'groups-tournament.groups-tournament',
      'oneToMany',
      'api::match.match'
    >;
    couples: Attribute.Component<'couple.couple', true>;
  };
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

export interface SetsSets extends Schema.Component {
  collectionName: 'components_sets_sets';
  info: {
    displayName: 'sets';
    description: '';
  };
  attributes: {
    games: Attribute.Component<'games.games', true>;
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
      'attributes.attributes': AttributesAttributes;
      'couple.couple': CoupleCouple;
      'details.details': DetailsDetails;
      'games.games': GamesGames;
      'groups-tournament.groups-tournament': GroupsTournamentGroupsTournament;
      'location.location': LocationLocation;
      'sets.sets': SetsSets;
      'sports.sport': SportsSport;
    }
  }
}
