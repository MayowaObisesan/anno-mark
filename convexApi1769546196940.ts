import { type FunctionReference, anyApi } from "convex/server";
import { type GenericId as Id } from "convex/values";

export const api: PublicApiType = anyApi as unknown as PublicApiType;
export const internal: InternalApiType = anyApi as unknown as InternalApiType;

export type PublicApiType = {
  annotations: {
    saveUserAnnotation: FunctionReference<
      "mutation",
      "public",
      {
        description?: string;
        fileSize: number;
        height: number;
        imageKitFileId?: string;
        imageKitUrl: string;
        tags?: Array<string>;
        thumbnailUrl?: string;
        timestamp: number;
        title: string;
        url?: string;
        userId: Id<"users">;
        width: number;
      },
      any
    >;
    getUserAnnotations: FunctionReference<
      "query",
      "public",
      { userId: Id<"users"> },
      any
    >;
    getUserAnnotationsPaginated: FunctionReference<
      "query",
      "public",
      {
        paginationOpts?: { cursor?: string; limit: number };
        userId: Id<"users">;
      },
      any
    >;
    getAnnotationById: FunctionReference<
      "query",
      "public",
      { annotationId: Id<"annotations"> },
      any
    >;
    deleteUserAnnotation: FunctionReference<
      "mutation",
      "public",
      { annotationId: Id<"annotations"> },
      any
    >;
    updateUserAnnotation: FunctionReference<
      "mutation",
      "public",
      {
        annotationId: Id<"annotations">;
        updates: { description?: string; tags?: Array<string>; title?: string };
      },
      any
    >;
    searchUserAnnotations: FunctionReference<
      "query",
      "public",
      { searchText?: string; tags?: Array<string>; userId: Id<"users"> },
      any
    >;
  };
  users: {
    getUserByClerkId: FunctionReference<
      "query",
      "public",
      { clerkId: string },
      any
    >;
    createOrUpdateUser: FunctionReference<
      "mutation",
      "public",
      { clerkId: string; email?: string; imageUrl?: string; name?: string },
      any
    >;
  };
};
export type InternalApiType = {};
