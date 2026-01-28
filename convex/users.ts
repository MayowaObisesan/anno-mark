import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const createOrUpdateUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      // Update existing user with new info if provided
      const updateData: any = {};
      if (args.email && args.email !== existingUser.email) {
        updateData.email = args.email;
      }
      if (args.name && args.name !== existingUser.name) {
        updateData.name = args.name;
      }
      if (args.imageUrl && args.imageUrl !== existingUser.imageUrl) {
        updateData.imageUrl = args.imageUrl;
      }

      if (Object.keys(updateData).length > 0) {
        await ctx.db.patch(existingUser._id, updateData);
      }

      return existingUser._id;
    }

    const userId = await ctx.db.insert("users", {
      ...args,
      createdAt: Date.now(),
    });

    return userId;
  },
});
