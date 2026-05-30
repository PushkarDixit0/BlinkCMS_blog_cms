import { z } from "zod";

export const commentFormSchema = z.object({
  authorName: z.string().trim().min(1, "Name is required.").max(80),
  comment: z.string().trim().min(1, "Comment is required.").max(1000),
});
