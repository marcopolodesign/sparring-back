const { createCoreController } = require('@strapi/strapi').factories;


const getUserProfilePicture = async (profilePicture) => {
    if (!profilePicture) return null;
    return profilePicture?.formats?.small?.url || profilePicture?.url || null;
  };
  
  const fetchUserDetails = async (user) => {
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePictureUrl: await getUserProfilePicture(user.profilePicture),
    };
  };
  

module.exports = createCoreController('api::zone.zone', ({ strapi }) => ({
  async getUsersByZone(ctx) {
    try {
      const { zoneId } = ctx.params;

      // Fetch zone details (to get the zone name)
      const zone = await strapi.entityService.findOne("api::zone.zone", zoneId, {
        fields: ["name"], // Fetch only the name field
      });

      if (!zone) {
        return ctx.notFound("Zone not found");
      }

      // Fetch users who belong to the given zone
      const users = await strapi.entityService.findMany("plugin::users-permissions.user", {
        filters: { zones: zoneId },
        populate: { profilePicture: true }, // Ensure we get the profile picture
      });

      // Format users using fetchUserDetails
      const formattedUsers = await Promise.all(users.map(fetchUserDetails));

      return ctx.send({
        zoneName: zone.name,
        users: formattedUsers
      });
    } catch (error) {
      console.error("Error fetching users by zone:", error);
      ctx.throw(500, "Internal Server Error");
    }
  },
}));