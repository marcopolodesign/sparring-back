module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/fupa/:id/participants',
      handler: 'fupa.findParticipants',
      config: {
        auth: false, // Set to true if authentication is required
      },
    },

    {
      method: 'GET',
      path: '/fupa/:id/match-result',
      handler: 'fupa.findMatchesWithCouples',
      config: {
        auth: false, // Set to true if authentication is required
      },
    },
    
    {
      method: 'GET',
      path: '/fupa/:id/groups',
      handler: 'fupa.findGroupMatches',
      config: {
        auth: false, // Set to true if authentication is required
      },
    },

    {
      method: 'GET',
      path: '/fupa/:id/groups',
      handler: 'fupa.findGroupMatches',
      config: {
        auth: false, // Set to true if authentication is required
      },
    },

    {
      method: 'GET',
      path: '/fupa/:tournamentId/members/:memberId/group',
      handler: 'fupa.findGroupByMemberId',
      config: {
        auth: false, // Adjust as needed
      },
    },

    {
      method: 'GET',
      path: '/fupa/:tournamentId/results',
      handler: 'fupa.getTournamentResults',
      config: {
         auth: false
      },
    },

    {
      method: 'GET',
      path: '/fupa/:tournamentId/results/:memberId/group/',
      handler: 'fupa.getGroupResults',
      config: {
         auth: false
      },
    },

    {
      "method": "DELETE",
      "path": "/fupa/:id/remove-fourth-set",
      "handler": "fupa.removeFourthSet",
      "config": {
        "policies": []
      }
    }
  ],
};
