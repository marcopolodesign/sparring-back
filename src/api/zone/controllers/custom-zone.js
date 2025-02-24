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
  
        // Fetch users who have the given zone populated
        const users = await strapi.entityService.findMany("plugin::users-permissions.user", {
          filters: { zones: zoneId },
          populate: { profilePicture: true }, // Ensure we get the profile picture
        });
  
        if (!users || users.length === 0) {
          return ctx.notFound("No users found in this zone");
        }
  
        // Format users using fetchUserDetails
        const formattedUsers = await Promise.all(users.map(fetchUserDetails));
  
        return ctx.send(formattedUsers);
      } catch (error) {
        console.error("Error fetching users by zone:", error);
        ctx.throw(500, "Internal Server Error");
      }
  },
}));