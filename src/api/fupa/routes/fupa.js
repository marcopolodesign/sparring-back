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
      "method": "GET",
      "path": "/tournaments/:id/couples",
      "handler": "fupa.findCouplesByGroup"
    },
    {
      method: 'GET',
      path: '/tournaments/:id/details',
      handler: 'fupa.findTournamentDetails',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/fupa/:id/new-matches/:sets',
      handler: 'fupa.generateMatches',
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
      path: '/fupa/:tournamentId/leaderboard',
      handler: 'fupa.getTournamentLeaderboard',
      config: {
         auth: false
      },
    },

    {
      method: 'GET',
      path: '/fupa/:tournamentId/results/:memberId',
      handler: 'fupa.getTournamentGroupsResults',
      config: {
         auth: false
      },
    },

    {
      "method": "DELETE",
      "path": "/fupa/:id/remove-fourth-set",
      "handler": "fupa.removeFourthSet",
      "config": {
        "policies": [], 
        auth: false,
      }
    }, 

    {
      "method": "PUT",
      "path": "/fupa/:tournamentId/assign-group-matches",
      "handler": "fupa.assignTournamentToMatches",
      "config": {
        "policies": [],
        auth: false
      }
    },


    {
      method: 'GET',
      path: '/fupa/test-login',
      handler: 'fupa.checkLoginStatus',
      config: {
        auth: false, // Set to true if authentication is required
      },
    },

    {
      method: 'POST',
      path: '/fupa/:tournamentId/generate-knockout',
      handler: 'fupa.generateKnockoutMatches',
      config: {
        auth: false, // Set to true if authentication is required
      },
    },

    {
      method: 'GET',
      path: '/fupa/:tournamentId/sixteen',
      handler: 'fupa.getSixteenMatches',
      config: {
        auth: false, // Set to true if authentication is required
      },
    },

    {
      method: 'GET',
      path: '/fupa/:tournamentId/quarters',
      handler: 'fupa.getQuarterfinalMatches',
      config: {
        auth: false, // Set to true if authentication is required
      },
    },

    {
      method: 'GET',
      path: '/fupa/:tournamentId/semis',
      handler: 'fupa.getSemifinalMatches',
      config: {
        auth: false, // Set to true if authentication is required
      },
    },

    {
      method: 'GET',
      path: '/fupa/:tournamentId/final',
      handler: 'fupa.getFinalMatch',
      config: {
        auth: false, // Set to true if authentication is required
      },
    },


    {
      method: 'GET',
      path: '/fupa/testing',
      handler: 'fupa.getTest',
      config: {
        auth: false, // Set to true if authentication is required
      },
    },

    {
      method: 'POST', 
      path: '/fupa/:tournamentId/create',
      handler: 'fupa.createMatches',
      config: {
        auth: false
      }
    },

    {
      method: 'POST',
      path: '/fupa/:tournamentId/generateBabolat',
      handler: 'fupa.generateGoldenCupKnockoutMatches',
      config: {
        auth: false
      }
    },

    {
      method: 'GET',
      path: '/fupa/:tournamentId/ranking',
      handler: 'fupa.getIndividualTournamentLeaderboard',
      config: {
        auth: false
      }
    },
    {
      method: 'DELETE',
      path: '/tournaments/:id/matches',
      handler: 'fupa.deleteTournamentMatches',
      config: {
        policies: [],
        middlewares: [],
      },
    },

    {
      method: 'POST',
      path: '/tournaments/:tournamentId/golden-cup/generate-matches',
      handler: 'fupa.generateGoldenCupMatches',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
