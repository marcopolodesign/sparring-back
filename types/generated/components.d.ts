import type { Schema, Attribute } from '@strapi/strapi';

export interface AmmenitiesAmmenities extends Schema.Component {
  collectionName: 'components_ammenities_ammenities';
  info: {
    displayName: 'ammenities';
    description: '';
  };
  attributes: {
    Canchas: Attribute.Enumeration<['Indoor', 'Outdoor']>;
  };
}

export interface AttributesAttributes extends Schema.Component {
  collectionName: 'components_attributes_attributes';
  info: {
    displayName: 'attributes';
    icon: 'chartBubble';
    description: '';
  };
  attributes: {
    utm_term: Attribute.String;
    utm_source: Attribute.String;
    utm_campaign: Attribute.String;
    utm_medium: Attribute.String;
    game_age: Attribute.Enumeration<['beginner', 'medium', 'advanced', 'pro']>;
    padel_lessons: Attribute.Boolean;
    competition_status: Attribute.Enumeration<
      ['friends', 'tournaments', 'league']
    >;
    sports: Attribute.JSON;
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
    score: Attribute.JSON;
  };
}

export interface CupCup extends Schema.Component {
  collectionName: 'cups';
  info: {
    displayName: 'Cup';
    description: 'Golden or Silver Cup rounds';
  };
  attributes: {
    quarterfinals: Attribute.Relation<
      'cup.cup',
      'oneToMany',
      'api::match.match'
    >;
    semifinals: Attribute.Relation<'cup.cup', 'oneToMany', 'api::match.match'>;
    final: Attribute.Relation<'cup.cup', 'oneToOne', 'api::match.match'>;
    sixteen: Attribute.Relation<'cup.cup', 'oneToMany', 'api::match.match'>;
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

export interface MembersMembers extends Schema.Component {
  collectionName: 'components_members_members';
  info: {
    displayName: 'Members';
  };
  attributes: {
    member: Attribute.Relation<
      'members.members',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    price: Attribute.Decimal;
  };
}

export interface MembersRanking extends Schema.Component {
  collectionName: 'components_members_rankings';
  info: {
    displayName: 'Ranking';
    description: '';
  };
  attributes: {
    player: Attribute.Relation<
      'members.ranking',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    points: Attribute.Integer;
  };
}

export interface RankingRankingTest extends Schema.Component {
  collectionName: 'components_ranking_ranking_tests';
  info: {
    displayName: 'ranking_test';
    description: '';
  };
  attributes: {
    player: Attribute.Relation<
      'ranking.ranking-test',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    points: Attribute.Integer;
    description: Attribute.String;
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

export interface TimeslotsTimeslots extends Schema.Component {
  collectionName: 'components_timeslots_timeslots';
  info: {
    displayName: 'Timeslots';
    description: '';
  };
  attributes: {
    start_time: Attribute.Time;
    end_time: Attribute.Time;
    reservation: Attribute.Relation<
      'timeslots.timeslots',
      'oneToOne',
      'api::reservation.reservation'
    >;
    is_reserved: Attribute.Boolean;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface Components {
      'ammenities.ammenities': AmmenitiesAmmenities;
      'attributes.attributes': AttributesAttributes;
      'couple.couple': CoupleCouple;
      'cup.cup': CupCup;
      'details.details': DetailsDetails;
      'games.games': GamesGames;
      'groups-tournament.groups-tournament': GroupsTournamentGroupsTournament;
      'location.location': LocationLocation;
      'members.members': MembersMembers;
      'members.ranking': MembersRanking;
      'ranking.ranking-test': RankingRankingTest;
      'sets.sets': SetsSets;
      'sports.sport': SportsSport;
      'timeslots.timeslots': TimeslotsTimeslots;
    }
  }
}
