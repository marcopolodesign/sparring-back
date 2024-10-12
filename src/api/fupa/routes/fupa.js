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
      method: 'POST',
      path: '/fupa/:id/new-matches',
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
      path: '/fupa/:tournamentId/quarters/:userId',
      handler: 'fupa.getQuarterfinalMatchesByUser',
      config: {
        auth: false, // Set to true if authentication is required
      },
    },

    {
      method: 'GET',
      path: '/fupa/:tournamentId/semis/:userId',
      handler: 'fupa.getSemifinalMatches',
      config: {
        auth: false, // Set to true if authentication is required
      },
    },

    {
      method: 'GET',
      path: '/fupa/:tournamentId/final/:userId',
      handler: 'fupa.getFinalMatches',
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

    
    

  ],
};
