import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const saveUserAnnotation = mutation({
  args: {
    userId: v.id("users"),
    imageKitUrl: v.string(),
    thumbnailUrl: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
    width: v.number(),
    height: v.number(),
    fileSize: v.number(),
    timestamp: v.number(),
    url: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    imageKitFileId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const annotationId = await ctx.db.insert("annotations", {
      ...args,
      createdAt: Date.now(),
    });

    return annotationId;
  },
});

export const getUserAnnotations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("annotations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const getUserAnnotationsPaginated = query({
  args: {
    userId: v.id("users"),
    paginationOpts: v.optional(v.object({
      limit: v.number(),
      cursor: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    if (args.paginationOpts) {
      return await ctx.db
        .query("annotations")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      return await ctx.db
        .query("annotations")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .order("desc")
        .collect();
    }
  },
});

export const getAnnotationById = query({
  args: { annotationId: v.id("annotations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.annotationId);
  },
});

export const deleteUserAnnotation = mutation({
  args: { annotationId: v.id("annotations") },
  handler: async (ctx, args) => {
    const annotation = await ctx.db.get(args.annotationId);
    if (!annotation) {
      throw new Error("Annotation not found");
    }
    
    await ctx.db.delete(args.annotationId);
    return { success: true, deletedId: args.annotationId };
  },
});

export const updateUserAnnotation = mutation({
  args: {
    annotationId: v.id("annotations"),
    updates: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const annotation = await ctx.db.get(args.annotationId);
    if (!annotation) {
      throw new Error("Annotation not found");
    }

    await ctx.db.patch(args.annotationId, args.updates);
    return { success: true, updatedId: args.annotationId };
  },
});

export const searchUserAnnotations = query({
  args: {
    userId: v.id("users"),
    searchText: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("annotations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc");

    const annotations = await query.collect();

    // Filter results based on search criteria
    let filteredAnnotations = annotations;

    if (args.searchText) {
      const searchLower = args.searchText.toLowerCase();
      filteredAnnotations = filteredAnnotations.filter(annotation =>
        annotation.title.toLowerCase().includes(searchLower) ||
        (annotation.description && annotation.description.toLowerCase().includes(searchLower))
      );
    }

    if (args.tags && args.tags.length > 0) {
      filteredAnnotations = filteredAnnotations.filter(annotation =>
        annotation.tags && args.tags!.some(tag => annotation.tags!.includes(tag))
      );
    }

    return filteredAnnotations;
  },
});
