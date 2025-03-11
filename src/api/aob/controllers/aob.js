'use strict';


module.exports = {
  async deleteAccount(ctx) {
    try {
      const {userId} = ctx.params; // Get logged-in user

      console.log(userId);
      if (!userId) {
        return ctx.unauthorized("You must be logged in to delete your account.");
      }

      // Delete the user from Strapi
      await strapi.entityService.delete("plugin::users-permissions.user", userId);

      return ctx.send({ message: "Your account has been deleted successfully." });
    } catch (error) {
      console.error("Error deleting user:", error);
      return ctx.internalServerError("Something went wrong while deleting your account.");
    }
  },
};