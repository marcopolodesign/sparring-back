module.exports = {
  routes: [
    {
      "method": "GET",
      "path": "/own-matches",
      "handler": "own-matches.findOwnMatches",
      "config": {
        "policies": []
      }
    }
  ]
}